# Generated by Django 4.2.17 on 2024-12-19 21:53

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('api', '0003_message_guild'),
    ]

    operations = [
        migrations.AddField(
            model_name='message',
            name='char_count',
            field=models.IntegerField(default=0),
        ),
        migrations.AddField(
            model_name='message',
            name='word_count',
            field=models.IntegerField(default=0),
        ),
    ]