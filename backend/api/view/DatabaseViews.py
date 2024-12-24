from rest_framework.views import APIView
from rest_framework.permissions import IsAuthenticated, AllowAny
from rest_framework.pagination import PageNumberPagination
from rest_framework.response import Response
from ..models import Message
from django.shortcuts import get_object_or_404
from datetime import datetime, timedelta
import pytz
from django.db.models import Q, Prefetch, Count
from ..models import Message, Guild, Channel, DiscordUser

class MessagePagination(PageNumberPagination):
    page_size = 50
    page_size_query_param = 'page_size'
    max_page_size = 1000

class DatabaseView(APIView):
    permission_classes = [AllowAny]
    pagination_class = MessagePagination

    def get(self, request):
        filters = Q()
        params = request.query_params
        
        if server := params.get('server'):
            filters &= Q(guild__name=server)
        if channel := params.get('channel'):
            filters &= Q(channel__name=channel)
        if user := params.get('user'):
            filters &= Q(author__name=user)
        if date := params.get('date'):
            try:
                timezone_name = params.get('timezone', 'UTC')
                local_tz = pytz.timezone(timezone_name)
                
                # Parse the date in the local timezone
                date_obj = datetime.strptime(date, '%Y-%m-%d')
                
                # Create start and end datetime in the local timezone
                start_date = local_tz.localize(
                    date_obj.replace(hour=0, minute=0, second=0, microsecond=0)
                )
                end_date = local_tz.localize(
                    date_obj.replace(hour=23, minute=59, second=59, microsecond=999999)
                )
                
                # Convert to UTC for database query
                start_date_utc = start_date.astimezone(pytz.UTC)
                end_date_utc = end_date.astimezone(pytz.UTC)
                
                filters &= Q(timestamp__range=(start_date_utc, end_date_utc))
            except (ValueError, pytz.exceptions.PyTzError):
                pass  # Invalid date format or timezone, ignore the filter
        
        # Combine all attachment/mention/emoji filters
        content_filters = []
        if params.get('has_attachment') == 'true':
            content_filters.append(~Q(attachments=[]))
        if params.get('has_mention') == 'true':
            content_filters.append(~Q(mentions=[]))
        if params.get('has_emoji') == 'true':
            content_filters.append(~Q(inline_emojis=[]))
        
        if content_filters:
            filters &= Q(*content_filters, _connector=Q.AND)

        # Optimize query with select_related
        messages = (
            Message.objects
            .select_related('guild', 'channel', 'author')
            .filter(filters)
            .order_by('-timestamp')
            .values(
                'id',
                'guild__name',
                'channel__name',
                'author__name',
                'timestamp',
                'char_count',
                'word_count',
                'attachments',
                'mentions',
                'inline_emojis',
                'content'
            )
        )

        paginator = self.pagination_class()
        page = paginator.paginate_queryset(messages, request)

        data = [{
            'id': msg['id'],
            'server_name': msg['guild__name'],
            'channel_name': msg['channel__name'],
            'user_name': msg['author__name'],
            'timestamp': msg['timestamp'],
            'char_count': msg['char_count'],
            'word_count': msg['word_count'],
            'contains_attachment': bool(msg['attachments']),
            'contains_mention': bool(msg['mentions']),
            'contains_emoji': bool(msg['inline_emojis']),
            'emojis_used': msg['inline_emojis'],
            'message_content': msg['content'],
        } for msg in page]

        return paginator.get_paginated_response(data)

class DatabaseMessageDetailView(APIView):
    permission_classes = [AllowAny]

    def get(self, request, pk):
        # Fetch message with all related data in a single query
        message = get_object_or_404(
            Message.objects
            .select_related('guild', 'channel', 'author', 'reference_message')
            .prefetch_related('author__roles'),
            pk=pk
        )

        return Response({
            'id': message.id,
            'guild': {
                'id': message.guild.id,
                'name': message.guild.name,
                'icon_url': message.guild.icon_url
            } if message.guild else None,
            'channel': {
                'id': message.channel.id,
                'name': message.channel.name,
                'type': message.channel.type,
                'category_name': message.channel.category_name
            },
            'author': {
                'id': message.author.id,
                'name': message.author.name,
                'discriminator': message.author.discriminator,
                'nickname': message.author.nickname,
                'avatar_url': message.author.avatar_url,
                'roles': [
                    {
                        'id': role.id,
                        'name': role.name,
                        'color': role.color,
                        'position': role.position
                    } for role in message.author.roles.all()
                ]
            },
            'type': message.type,
            'content': message.content,
            'timestamp': message.timestamp,
            'timestamp_edited': message.timestamp_edited,
            'call_ended': message.call_ended,
            'is_pinned': message.is_pinned,
            'reference_message': {
                'id': message.reference_message.id,
                'content': message.reference_message.content,
                'author': message.reference_message.author.name
            } if message.reference_message else None,
            'reactions': message.reactions,
            'attachments': message.attachments,
            'embeds': message.embeds,
            'stickers': message.stickers,
            'mentions': message.mentions,
            'inline_emojis': message.inline_emojis
        })

    def put(self, request, pk):
        message = get_object_or_404(Message, pk=pk)
        for key, value in request.data.items():
            setattr(message, key, value)
        message.save()
        return Response({'status': 'success'})

    def delete(self, request, pk):
        message = get_object_or_404(Message, pk=pk)
        message.delete()
        return Response(status=204)

class FilterOptionsView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        return Response({
            'servers': Guild.objects.values_list('name', flat=True).distinct(),
            'channels': Channel.objects.values_list('name', flat=True).distinct(),
            'users': DiscordUser.objects.values_list('name', flat=True).distinct(),
        })