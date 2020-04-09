"""Detect text in a video stored on GCS."""
from google.cloud import videointelligence


video_client = videointelligence.VideoIntelligenceServiceClient()
features = [videointelligence.enums.Feature.TEXT_DETECTION]


def uri_parser(video_name):
    """

    :param video_name: example URI: 'video/{uid}/{campaign_id}/{history_id}/beauty_video_1.mov'
    :return:
    """
    _, uid, campaign_id, history_id, _ = video_name.split('/')
    return uid, campaign_id, history_id


def video_text_reg(input_uri, confidence_threshold=0.95):
    """
    Calling GCP video inteligence API for text recognition
    :param input_uri: path to file on GCS
    :param confidence_threshold: confidence threshold to filter out less-reliable detection results.
    :return:
    """
    operation = video_client.annotate_video(input_uri=input_uri, features=features)

    print("\nProcessing video for text detection.")
    result = operation.result(timeout=600)

    # The first result is retrieved because a single video was processed.
    annotation_result = result.annotation_results[0]
    res = []

    for text_annotation in annotation_result.text_annotations:
        cur_text = text_annotation.text
        print("\nText: {}".format(cur_text))

        # Get the first text segment
        text_segment = text_annotation.segments[0]
        confidence_score = text_segment.confidence
        if confidence_score >= confidence_threshold:
            print("Confidence: {}".format(confidence_score))
        else:
            print(f"Current text {cur_text} is ignored due to low confidence {confidence_score}")
            continue
        cur_res = {}
        start_time = text_segment.segment.start_time_offset
        end_time = text_segment.segment.end_time_offset

        # Show the result for the first frame in this segment.
        frame = text_segment.frames[0]
        time_offset = frame.time_offset
        print(
            "Time offset for the first frame: {}".format(
                time_offset.seconds + time_offset.nanos * 1e-9
            )
        )
        cur_res['text'] = text_annotation.text
        cur_res['confidence_score'] = confidence_score
        cur_res['seg_start_time'] = start_time.seconds + start_time.nanos * 1e-9
        cur_res['seg_end_time'] = end_time.seconds + end_time.nanos * 1e-9
        cur_res['first_frame_time_offset'] = time_offset.seconds + time_offset.nanos * 1e-9
        res.append(cur_res)
    return res

