from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from rest_framework.permissions import AllowAny
from ..models import Channel

class ChannelProfileView(APIView):
    permission_classes = [AllowAny]

    def get(self, request, channel_name):
        try:
            channel = Channel.objects.get(name=channel_name)
            data = {
                'id': channel.id,
                'name': channel.name,
                'type': channel.type,
                'category_name': channel.category_name,
                'topic': channel.topic,
                'total_messages': channel.total_messages,
                'total_words': channel.total_words,
                'total_characters': channel.total_characters,
                'guild_icon_url': channel.guild.icon_url if channel.guild else None,
            }
            return Response(data, status=status.HTTP_200_OK)
        except Channel.DoesNotExist:
            return Response({'error': 'Channel not found'}, status=status.HTTP_404_NOT_FOUND)
