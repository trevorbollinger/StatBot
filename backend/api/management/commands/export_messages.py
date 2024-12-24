from django.core.management.base import BaseCommand
from api.models import Message
from django.db import transaction
import os

class Command(BaseCommand):
    help = 'Exports all messages to a plain text file'

    def add_arguments(self, parser):
        parser.add_argument(
            '--output',
            default='messages_export.txt',  # Changed default extension to .txt
            help='Output file path'
        )
        parser.add_argument(
            '--batch-size',
            type=int,
            default=10000,
            help='Number of messages to process in each batch'
        )

    def handle(self, *args, **options):
        output_file = options['output']
        batch_size = options['batch_size']
        
        os.makedirs(os.path.dirname(os.path.abspath(output_file)), exist_ok=True)

        messages_queryset = (
            Message.objects
            .select_related('author')  # Only select_related author since we need its name
            .filter(
                author__is_bot=False,
                content__isnull=False
            )
            .exclude(content__exact='')
            .exclude(channel__name__in=[
                'bot-shit', 'copypasta', 'quotes-madness-2021',
                'quotes-madness-2024', 'test', 'john', 'tall-grass'
            ])
            .exclude(content__istartswith='pls')  # Exclude messages starting with 'pls'
            .order_by('timestamp')
            .only(
                'timestamp',
                'content',
                'author__name'
            )
        )
        
        total_messages = messages_queryset.count()
        self.stdout.write(f"Starting export of {total_messages} messages...")

        processed = 0
        try:
            with open(output_file, 'w', encoding='utf-8') as f:
                for batch in self.batch_queryset(messages_queryset, batch_size):
                    for msg in batch:
                        formatted_line = f"[{msg.author.name}] {msg.content}\n"
                        f.write(formatted_line)
                        processed += 1
                    
                    # Show progress
                    progress = (processed / total_messages) * 100
                    self.stdout.write(f"Processed {processed}/{total_messages} messages ({progress:.1f}%)")

            self.stdout.write(
                self.style.SUCCESS(f'Successfully exported {processed} messages to {output_file}')
            )

        except Exception as e:
            self.stdout.write(
                self.style.ERROR(f'Error during export: {str(e)}')
            )
            raise

    def batch_queryset(self, queryset, batch_size):
        """Helper method to yield queryset in batches."""
        start = 0
        while True:
            batch = queryset[start:start + batch_size]
            if not batch:
                break
            yield batch
            start += batch_size