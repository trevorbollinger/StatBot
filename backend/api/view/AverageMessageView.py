from rest_framework.views import APIView
from rest_framework.permissions import IsAuthenticated, AllowAny
from rest_framework.response import Response
from ..models import Message
from django.db.models import Avg, F, functions, Min, Max, Count, Sum
from django.db.models.functions import Length, Substr
from django.db.models import Value
import string
from collections import Counter

class AverageMessageView(APIView):
    permission_classes = [AllowAny]
    
    def get(self, request):
        stats = Message.objects.aggregate(
            message_count=Count('id'),
            avg_length=Avg(Length('message_content')),
            min_length=Min(Length('message_content')),
            max_length=Max(Length('message_content')),
            total_chars=Sum(Length('message_content'))
        )
        
        avg_len = round(stats['avg_length'] or 0)
        max_positions = avg_len
        
        common_chars_string = ''
        for pos in range(1, max_positions + 1):
            # Get total messages at this position
            total_at_pos = Message.objects.filter(
                message_content__regex=f'^.{{{pos}}}'
            ).count()
            
            # Get most common character at this position using case-insensitive comparison
            char_freq = Message.objects.exclude(
                message_content__exact=''
            ).annotate(
                char_at_pos=functions.Lower(Substr('message_content', pos, 1))
            ).exclude(
                char_at_pos=''
            ).values('char_at_pos').annotate(
                count=Count('id')
            ).order_by('-count')
            
            most_common = char_freq.first()
            
            if (most_common and most_common['char_at_pos'] == ' '):
                # Check if space meets 70% threshold
                space_percentage = (most_common['count'] / total_at_pos) * 100
                if space_percentage < 19.8:
                    # If space doesn't meet threshold, get next non-space character
                    most_common = char_freq.exclude(char_at_pos=' ').first()
            
            if most_common and most_common['char_at_pos']:
                common_chars_string += most_common['char_at_pos']
        
        # Get messages in lowercase
        messages = Message.objects.exclude(
            message_content__exact=''
        ).annotate(
            content_lower=functions.Lower('message_content')
        ).values_list('content_lower', flat=True)
        
        # Process words and track frequency
        word_frequencies_by_position = {}
        word_counts = []
        
        for message in messages:
            # Message is already lowercase from the query
            words = [w.rstrip(',.') for w in message.split()]
            word_counts.append(len(words))
            
            for i, word in enumerate(words):
                position = i + 1
                if position not in word_frequencies_by_position:
                    word_frequencies_by_position[position] = Counter()
                if word:  # Skip empty words
                    word_frequencies_by_position[position][word] += 1  # removed .lower() since already lowercase
        
        max_words = 50
        
        # Get most common word for each position
        common_words = {
            f'most_common_word_{pos}': {
                'word': freq.most_common(1)[0][0],
                'count': freq.most_common(1)[0][1]
            }
            for pos, freq in word_frequencies_by_position.items()
            if pos <= max_words and freq
        }

        # Create concatenated string of most common words
        average_message_words = ' '.join(
            freq.most_common(1)[0][0]
            for pos, freq in sorted(word_frequencies_by_position.items())
            if pos <= max_words and freq
        )

        response_data = {
            'average_message_chars': common_chars_string,
            'average_message_words': average_message_words
        }
        
        return Response(response_data)


