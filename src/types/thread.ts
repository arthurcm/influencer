export interface ThreadStatus {
    deleted: boolean;
    media_object_path: string;
    resolved: boolean;
    timestamp: Timestamp;
}

export interface Feedback {
    like: number;
    dislike: number;
    extra_data: object;
    feedback_str: string;
    media_object_path: string;
    image_bounding_box: object;
    timestamp: Timestamp;
    video_offset: number;
    original?: boolean;
    displayName?: string;
}

export interface Thread {
    thread: ThreadStatus;
    feedback_list: Feedback[];
    thread_id: string;
}

export interface Timestamp {
    _seconds: number;
    _nanoseconds: number;
}
