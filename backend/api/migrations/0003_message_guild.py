# Generated by Django 4.2.17 on 2024-12-19 20:23

from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        ('api', '0002_message_attachments_message_embeds_and_more'),
    ]

    operations = [
        migrations.AddField(
            model_name='message',
            name='guild',
            field=models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.CASCADE, related_name='messages', to='api.guild'),
        ),
    ]
