from django.shortcuts import render
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import AllowAny
from django.db.models import Count
from django.db.models.functions import TruncMinute
from django.utils import timezone
from ..models import Message

class MessageTimelineView(APIView):
    permission_classes = [AllowAny]

    def get(self, request):
        # Get current time in UTC
        now = timezone.now()
        start_time = now - timezone.timedelta(hours=24)

        # Get message counts by minute
        message_counts = (
            Message.objects
            .filter(timestamp__gte=start_time)
            .annotate(
                minute=TruncMinute('timestamp')
            )
            .values('minute')
            .annotate(count=Count('id'))
            .order_by('minute')
        )

        # Create a minute-by-minute lookup, staying in UTC
        count_lookup = {
            m['minute'].isoformat(): m['count']
            for m in message_counts
        }

        # Generate all minutes in UTC
        intervals = []
        current = start_time.replace(second=0, microsecond=0)
        end_time = now.replace(second=0, microsecond=0)

        while current <= end_time:
            intervals.append({
                'timestamp': current.isoformat(),
                'count': count_lookup.get(current.isoformat(), 0)
            })
            current += timezone.timedelta(minutes=1)

        # Add debug information
        total_messages = sum(count_lookup.values())
        active_minutes = sum(1 for count in count_lookup.values() if count > 0)

        return Response({
            'intervals': intervals,
            'debug_info': {
                'now': now.isoformat(),
                'start_time': start_time.isoformat(),
                'end_time': end_time.isoformat(),
                'total_messages': total_messages,
                'unique_minutes': active_minutes,
                'sample_counts': dict(list(count_lookup.items())[:5]),
            }
        })