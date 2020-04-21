from google.cloud import vision
import logging

def web_entities_include_geo_results_uri(uri):
    """Detects web annotations given an image in the file located in
    Google Cloud Storage., using the geotag metadata in the image to
    detect web entities."""
    client = vision.ImageAnnotatorClient()

    image = vision.types.Image()
    image.source.image_uri = uri

    web_detection_params = vision.types.WebDetectionParams(
        include_geo_results=True)
    image_context = vision.types.ImageContext(
        web_detection_params=web_detection_params)

    response = client.web_detection(image=image, image_context=image_context)
    res = {}
    res['entity_score'] = -1
    res['entity_description'] = ''
    res['best_guess_label'] = ''
    res['full_match_image_cnt'] = 0
    res['full_match_image_urls'] = []
    res['full_match_page_urls'] = []
    annotations = response.web_detection
    if annotations.web_entities:
        for entity in annotations.web_entities:
            if entity.score <= 0.90:
                # logging.info(f'Found less probable entity {entity.description}, continue')
                continue
            else:
                # this is assuming the score is sorted in descending order
                logging.info('\n\tScore      : {}'.format(entity.score))
                logging.info(u'\tDescription: {}'.format(entity.description))
                res['entity_score'] = entity.score
                res['entity_description'] = entity.description

                # here we only generate best_guess_label when the entity is meaningful -- very probable
                if annotations.best_guess_labels:
                    for label in annotations.best_guess_labels:
                        logging.info('\nBest guess label: {}'.format(label.label))
                        res['best_guess_label'] = label.label
            break

    if annotations.pages_with_matching_images:
        logging.info('\n{} Pages with matching images found:'.format(
            len(annotations.pages_with_matching_images)))
        res['full_match_image_cnt'] = len(annotations.pages_with_matching_images)

        full_match_image_url_list = []
        full_match_page_url_list = []
        for page in annotations.pages_with_matching_images:
            logging.info('\n\tPage url   : {}'.format(page.url))
            full_match_page_url_list.append(page.url)

            if page.full_matching_images:
                for image in page.full_matching_images:
                    logging.info('\t\tImage url  : {}'.format(image.url))
                    full_match_image_url_list.append(image.url)
        res['full_match_image_urls'] = full_match_page_url_list
        res['full_match_image_urls'] = full_match_image_url_list

    if res['full_match_image_cnt'] > 0:
        res['potential_risk'] = True
    else:
        res['potential_risk'] = False

    if response.error.message:
        raise Exception(
            '{}\nFor more info on error messages, check: '
            'https://cloud.google.com/apis/design/errors'.format(
                response.error.message))
    return res