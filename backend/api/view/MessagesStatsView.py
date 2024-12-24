from django.shortcuts import render
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import AllowAny
from django.db.models import Count, Sum, F, Q
from django.db.models.functions import TruncDate
from django.utils import timezone
import pytz
from ..models import Message

class MessagesStatsView(APIView):
    permission_classes = [AllowAny]

    def get(self, request):
        now = timezone.now()
        last_24_hours = now - timezone.timedelta(hours=24)

        # Get basic stats using database aggregation
        basic_stats = Message.objects.aggregate(
            total_messages=Count('id'),
            total_words=Sum('word_count'),
            total_characters=Sum('char_count'),
            messages_last_24h=Count('id', filter=Q(timestamp__gte=last_24_hours))
        )

        if not basic_stats['total_messages']:
            return Response({
                'total_messages': 0,
                'total_words': 0,
                'total_characters': 0,
                'messages_last_24_hours': 0,
                'average_messages_per_day': 0,
                'most_active_day': None,
                'least_active_day': None,
                'daily_messages': []
            })

        # Get daily message counts using database aggregation
        daily_counts = Message.objects.annotate(
            date=TruncDate('timestamp')
        ).values('date').annotate(
            count=Count('id')
        ).order_by('date')

        # Convert to list and find most active day
        daily_messages = [
            {'date': item['date'], 'count': item['count']}
            for item in daily_counts
        ]

        # Calculate average excluding first and last day
        if len(daily_messages) > 2:
            middle_days = daily_messages[1:-1]
            avg_messages = sum(day['count'] for day in middle_days) / len(middle_days)
        else:
            avg_messages = basic_stats['total_messages'] / len(daily_messages) if daily_messages else 0

        most_active_day = max(daily_messages, key=lambda x: x['count']) if daily_messages else None
        least_active_day = min(daily_messages, key=lambda x: x['count']) if daily_messages else None

        return Response({
            'total_messages': basic_stats['total_messages'],
            'total_words': basic_stats['total_words'],
            'total_characters': basic_stats['total_characters'],
            'messages_last_24_hours': basic_stats['messages_last_24h'],
            'average_messages_per_day': avg_messages,
            'most_active_day': most_active_day,
            'least_active_day': least_active_day,
            'daily_messages': daily_messages
        })