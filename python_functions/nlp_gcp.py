from google.cloud import language_v1
from google.cloud.language_v1 import enums

client = language_v1.LanguageServiceClient()


def nlp_text_sentiment(text_content):
    """
    Analyzing Sentiment in a String

    Args:
      text_content The text content to analyze
    """
    # Available types: PLAIN_TEXT, HTML
    type_ = enums.Document.Type.PLAIN_TEXT

    # Optional. If not specified, the language is automatically detected.
    # For list of supported languages:
    # https://cloud.google.com/natural-language/docs/languages
    document = {"content": text_content, "type": type_}

    # Available values: NONE, UTF8, UTF16, UTF32
    encoding_type = enums.EncodingType.UTF8

    response = client.analyze_sentiment(document, encoding_type=encoding_type)
    score, magnitude = response.document_sentiment.score, response.document_sentiment.magnitude
    # Get overall sentiment of the input document
    print(f"Document sentiment score: {score} with magnitude: {magnitude}")
    return score, magnitude
