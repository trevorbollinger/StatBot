from django.shortcuts import render
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import AllowAny
from django.db.models import Count, Sum, F, Q
from ..models import Channel, Message

class ChannelsStatsView(APIView):
    permission_classes = [AllowAny]

    def get(self, request):
        # Get excluded users from query params
        excluded_users = request.query_params.get('exclude_user', '').split(',')
        excluded_users = [user.strip() for user in excluded_users if user.strip()]

        # Get excluded channels from query params
        excluded_channels = request.query_params.get('exclude_channel', '').split(',')
        excluded_channels = [channel.strip() for channel in excluded_channels if channel.strip()]

        # Get bot exclusion parameter
        exclude_bots = request.query_params.get('exclude_bots', '').lower() == 'true'

        # Build base message filter
        message_filter = Q()
        if excluded_users:
            message_filter &= ~Q(messages__author__name__in=excluded_users)
        if exclude_bots:
            message_filter &= ~Q(messages__author__is_bot=True)

        # Base queryset excluding specified channels
        base_query = Channel.objects
        if excluded_channels:
            base_query = base_query.exclude(name__in=excluded_channels)

        # Get channel stats with annotations
        channel_stats = (
            base_query
            .annotate(
                filtered_messages=Count(
                    'messages',
                    filter=message_filter
                ),
                filtered_words=Sum(
                    'messages__word_count',
                    filter=message_filter
                ),
                filtered_chars=Sum(
                    'messages__char_count',
                    filter=message_filter
                ),
                attachments_count=Count(
                    'messages',
                    filter=message_filter & ~Q(messages__attachments=[])
                ),
                mentions_count=Count(
                    'messages',
                    filter=message_filter & ~Q(messages__mentions=[])
                ),
                emoji_count=Count(
                    'messages',
                    filter=message_filter & ~Q(messages__inline_emojis=[])
                )
            )
            .values(
                'name',
                'filtered_messages',
                'filtered_words',
                'filtered_chars',
                'attachments_count',
                'mentions_count',
                'emoji_count'
            )
        )

        # Calculate total stats with all filters applied
        total_stats_filter = Q()
        if excluded_channels:
            total_stats_filter &= ~Q(channel__name__in=excluded_channels)
        if excluded_users:
            total_stats_filter &= ~Q(author__name__in=excluded_users)
        if exclude_bots:
            total_stats_filter &= ~Q(author__is_bot=True)

        total_stats = Message.objects.filter(total_stats_filter).aggregate(
            total_messages=Count('id'),
            total_words=Sum('word_count'),
            total_characters=Sum('char_count')
        )

        results = []
        for channel in channel_stats:
            if channel['filtered_messages'] == 0:
                continue

            # Build user stats filter
            user_filter = Q(channel__name=channel['name'])
            if excluded_users:
                user_filter &= ~Q(author__name__in=excluded_users)
            if exclude_bots:
                user_filter &= ~Q(author__is_bot=True)

            # Get most active user with proper exclusions
            user_stats = (
                Message.objects
                .filter(user_filter)
                .values('author__name')
                .annotate(count=Count('id'))
                .order_by('-count')
                .first()
            )

            if user_stats:
                user_percentage = (user_stats['count'] / channel['filtered_messages']) * 100
                most_active_user = user_stats['author__name']
            else:
                user_percentage = 0
                most_active_user = 'unknown'

            results.append({
                'channel_name': channel['name'],
                'message_count': channel['filtered_messages'],
                'total_words': channel['filtered_words'] or 0,
                'total_characters': channel['filtered_chars'] or 0,
                'attachments': channel['attachments_count'],
                'mentions': channel['mentions_count'],
                'emojis': channel['emoji_count'],
                'most_active_user': most_active_user,
                'most_active_user_percentage': round(user_percentage, 1)
            })

        results.sort(key=lambda x: x['message_count'], reverse=True)

        return Response({
            **total_stats,
            'channels': results
        })
