from django.contrib import admin
from .models import Guild, Channel, Role, DiscordUser, Message

# Register your models here.
admin.site.register(Guild)
admin.site.register(Channel)
admin.site.register(Role)
admin.site.register(DiscordUser)
admin.site.register(Message)
