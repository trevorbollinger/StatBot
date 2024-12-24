from django.shortcuts import render
from django.contrib.auth.models import User
from rest_framework import generics, viewsets, status
from ..serializers import UserSerializer, MessageSerializer
from rest_framework.permissions import IsAuthenticated, AllowAny
from ..models import Message, DiscordUser
from rest_framework.views import APIView
from rest_framework.response import Response
from django.db import models
from django.db.models import Count, Sum, F
from django.db.models.functions import Length, Replace
from django.utils import timezone 
import pytz  
central_tz = pytz.timezone('America/Chicago') 

class CreateUserView(generics.CreateAPIView):
    queryset = User.objects.all()
    serializer_class = UserSerializer
    permission_classes = [IsAuthenticated]
    
    
class UserDetailView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        user = request.user
        return Response({
            'id': user.id,
            'username': user.username,
            'first_name': user.first_name,
            'last_name': user.last_name,
            'email': user.email,
            'is_staff': user.is_staff
        })

    def put(self, request):
        user = request.user
        serializer = UserSerializer(user, data=request.data, partial=True)
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data)
        return Response(serializer.errors, status=400)

    def delete(self, request):
        user = request.user
        user.delete()
        return Response(status=204)

class DiscordUserDetailView(APIView):
    permission_classes = [AllowAny]

    def get(self, request, username):
        try:
            # Efficiently fetch user and roles in a single query
            user = (DiscordUser.objects
                   .prefetch_related('roles')
                   .get(name=username))
            
            roles = user.roles.values('id', 'name', 'color', 'position')

            return Response({
                'id': user.id,
                'name': user.name,
                'discriminator': user.discriminator,
                'nickname': user.nickname,
                'avatar_url': user.avatar_url,
                'color': user.color,
                'is_bot': user.is_bot,
                'total_messages': user.total_messages,
                'total_words': user.total_words,
                'total_characters': user.total_characters,
                'roles': list(roles)
            })
        except DiscordUser.DoesNotExist:
            return Response(
                {'error': f'User {username} not found'}, 
                status=status.HTTP_404_NOT_FOUND
            )

    def patch(self, request, username):
        try:
            user = DiscordUser.objects.get(name=username)
            # Only allow updating certain fields
            allowed_fields = ['nickname', 'avatar_url', 'color']
            for field in allowed_fields:
                if field in request.data:
                    setattr(user, field, request.data[field])
            user.save()
            
            return Response({
                'id': user.id,
                'name': user.name,
                'nickname': user.nickname,
                'avatar_url': user.avatar_url,
                'color': user.color
            })
        except DiscordUser.DoesNotExist:
            return Response(
                {'error': f'User {username} not found'}, 
                status=status.HTTP_404_NOT_FOUND
            )