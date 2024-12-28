from django.shortcuts import render
from django.contrib.auth.models import User
from rest_framework import generics, viewsets, status
from ..serializers import UserSerializer, MessageSerializer
from rest_framework.permissions import IsAuthenticated, AllowAny
from ..models import Message, DiscordUser, Channel
from rest_framework.views import APIView
from rest_framework.response import Response
from django.db import models
from django.db.models import Count, Sum, F, FloatField, Q
from django.db.models.functions import Cast
import pytz  
from django.db.models import Prefetch

central_tz = pytz.timezone('America/Chicago') 

class UsersStatsView(APIView):
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

        # Build channel filter
        channel_filter = ~Q(messages__channel__name__in=excluded_channels) if excluded_channels else Q()
        
        # Add bot filter and user exclusion filter
        base_query = DiscordUser.objects
        if exclude_bots:
            base_query = base_query.filter(is_bot=False)
        if excluded_users:
            base_query = base_query.exclude(name__in=excluded_users)

        user_stats = (
            base_query
            .prefetch_related(
                Prefetch(
                    'messages',
                    queryset=Message.objects.select_related('channel')
                )
            )
            .annotate(
                filtered_total_messages=Count(
                    'messages',
                    filter=channel_filter,
                    distinct=True
                ),
                filtered_total_words=Sum(
                    'messages__word_count',
                    filter=channel_filter
                ),
                filtered_total_characters=Sum(
                    'messages__char_count',
                    filter=channel_filter
                ),
                attachments_count=Count(
                    'messages',
                    filter=~Q(messages__attachments=[]) & channel_filter,
                    distinct=True
                ),
                mentions_count=Count(
                    'messages',
                    filter=~Q(messages__mentions=[]) & channel_filter,
                    distinct=True
                ),
                emoji_count=Count(
                    'messages',
                    filter=~Q(messages__inline_emojis=[]) & channel_filter,
                    distinct=True
                )
            )
            .values(
                'name',
                'nickname',
                'is_bot',  # Add is_bot field
                'filtered_total_messages',
                'filtered_total_words',
                'filtered_total_characters',
                'attachments_count',
                'mentions_count',
                'emoji_count'
            )
        )

        # Update total stats query to match all exclusions
        total_stats_filter = Q()
        if excluded_channels:
            total_stats_filter &= ~Q(channel__name__in=excluded_channels)
        if exclude_bots:
            total_stats_filter &= ~Q(author__is_bot=True)
        if excluded_users:  # Add this block
            total_stats_filter &= ~Q(author__name__in=excluded_users)

        total_stats = (
            Message.objects
            .filter(total_stats_filter)
            .aggregate(
                total_messages=Count('id'),
                total_words=Sum('word_count'),
                total_characters=Sum('char_count')
            )
        )

        results = []
        for user in user_stats:
            if user['filtered_total_messages'] == 0:
                continue

            # Get most active channel in a single efficient query
            channel_stats = (
                Message.objects
                .filter(author__name=user['name'])
                .exclude(channel__name__in=excluded_channels if excluded_channels else [])
                .values('channel__name')
                .annotate(count=Count('id'))
                .order_by('-count')
                .first()
            )

            if channel_stats:
                channel_percentage = (channel_stats['count'] / user['filtered_total_messages']) * 100
                most_active_channel = channel_stats['channel__name']
            else:
                channel_percentage = 0
                most_active_channel = 'unknown'

            results.append({
                'user_name': user['name'],
                'nickname': user['nickname'],
                'is_bot': user['is_bot'],  # Add is_bot to response
                'message_count': user['filtered_total_messages'],
                'total_words': user['filtered_total_words'] or 0,
                'total_characters': user['filtered_total_characters'] or 0,
                'attachments': user['attachments_count'],
                'mentions': user['mentions_count'],
                'emojis': user['emoji_count'],
                'most_active_channel': most_active_channel,
                'most_active_channel_percentage': round(channel_percentage, 1)
            })

        response_data = {
            **total_stats,
            'users': sorted(results, key=lambda x: x['message_count'], reverse=True)
        }

        return Response(response_data)

class UserMessageSums(APIView):
    permission_classes = [AllowAny]

    def get(self, request, username):
        stats = Message.objects.filter(user_name=username).aggregate(
            total_messages=models.Count('id'),
            total_characters=models.Sum('char_count'),
            total_words=models.Sum('word_count')
        )
        
        if stats['total_messages'] == 0:
            return Response(
                {'error': 'No messages found for this user'}, 
                status=status.HTTP_404_NOT_FOUND
            )

        return Response({
            'username': username,
            'total_messages': stats['total_messages'] or 0,
            'total_characters': stats['total_characters'] or 0,
            'total_words': stats['total_words'] or 0
        })

