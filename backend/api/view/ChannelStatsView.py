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
        excluded_users = request.query_params.get('exclude', '').split(',')
        excluded_users = [user.strip() for user in excluded_users if user.strip()]

        print(f"Excluding users: {excluded_users}")  # Debug log

        # Base queryset for messages excluding specified users
        message_filter = ~Q(messages__author__name__in=excluded_users) if excluded_users else Q()

        # Get channel stats with annotations
        channel_stats = (
            Channel.objects
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

        # Calculate total stats
        total_stats = {
            'total_messages': 0,
            'total_words': 0,
            'total_characters': 0
        }

        results = []
        for channel in channel_stats:
            if channel['filtered_messages'] == 0:
                continue

            # Get most active user with proper exclusion
            user_stats = (
                Message.objects
                .filter(channel__name=channel['name'])
                .exclude(author__name__in=excluded_users if excluded_users else [])
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

            # Update total stats
            total_stats['total_messages'] += channel['filtered_messages']
            total_stats['total_words'] += channel['filtered_words'] or 0
            total_stats['total_characters'] += channel['filtered_chars'] or 0

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

        # Sort by message count
        results.sort(key=lambda x: x['message_count'], reverse=True)

        return Response({
            **total_stats,
            'channels': results
        })
