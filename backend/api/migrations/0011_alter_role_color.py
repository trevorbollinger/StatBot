# Generated by Django 4.2.17 on 2024-12-23 22:33

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('api', '0010_message_api_message_timesta_97ab18_idx'),
    ]

    operations = [
        migrations.AlterField(
            model_name='role',
            name='color',
            field=models.CharField(blank=True, max_length=16, null=True),
        ),
    ]
