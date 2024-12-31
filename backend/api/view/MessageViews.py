from rest_framework import viewsets
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import AllowAny
from django.contrib.humanize.templatetags.humanize import naturaltime
from ..models import Message, DiscordUser
from ..serializers import MessageSerializer
from django.db.models import F
from django.db.models.functions import Length
import re

class MessageViewSet(viewsets.ModelViewSet):
    queryset = Message.objects.all()
    serializer_class = MessageSerializer
    permission_classes = [AllowAny]

class RecentMessagesView(APIView):
    permission_classes = [AllowAny]
    
    def get(self, request):
        # Get the last 100 messages
        messages = Message.objects.select_related(
            'author', 'channel'
        ).order_by('-timestamp')[:75]
        
        def count_words(text):
            return len(re.findall(r'\w+', text))
        
        message_data = []
        for message in messages:
            message_data.append({
                'id': message.id,
                'user_name': message.author.name,
                'nickname': message.author.nickname,
                'user_id': message.author.id,
                'channel_name': message.channel.name,
                'timestamp': message.timestamp,
                'relative_time': naturaltime(message.timestamp),
                'char_count': len(message.content),
                'word_count': count_words(message.content),
                'message_content': message.content,
                'avatar': message.author.avatar_url
            })
        
        return Response({'messages': message_data})

