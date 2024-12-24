from django.urls import path
from rest_framework import routers
from .view.MessageViews import MessageViewSet, RecentMessagesView
from .view.UserViews import CreateUserView, UserDetailView, DiscordUserDetailView
from .view.UserStatsView import UsersStatsView, UserMessageSums
from .view.DatabaseViews import DatabaseView, DatabaseMessageDetailView, FilterOptionsView
from .view.ChannelStatsView import ChannelsStatsView
from .view.MessageTimelineView import MessageTimelineView
from .view.MessagesStatsView import MessagesStatsView
from .view.AverageMessageView import AverageMessageView  # Add this import

router = routers.DefaultRouter()
router.register(r'messages', MessageViewSet)

urlpatterns = [
    path('user/me/', UserDetailView.as_view(), name='user-detail'),
    path('stats/users/', UsersStatsView.as_view(), name='stats'),  
    path('stats/channels/', ChannelsStatsView.as_view(), name='stats'),
    path('stats/recent-messages/', RecentMessagesView.as_view(), name='recent-messages'),
    path('stats/message-timeline/', MessageTimelineView.as_view(), name='message-timeline'),
    path('stats/message-stats/', MessagesStatsView.as_view(), name='message-stats'),
    path('database/messages/', DatabaseView.as_view(), name='database-messages'),
    path('database/messages/<int:pk>/', DatabaseMessageDetailView.as_view(), name='database-message-detail'),
    path('database/filter-options/', FilterOptionsView.as_view(), name='database-filter-options'),
    path('discorduser/<str:username>/', DiscordUserDetailView.as_view(), name='discord-user-detail'),
    path('user-messages-stats/<str:username>/', UserMessageSums.as_view(), name='user-messages-stats'),
    path('stats/average-message/', AverageMessageView.as_view(), name='message-length-stats'),
] + router.urls

