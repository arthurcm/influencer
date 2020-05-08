import { Component, OnInit, Input } from '@angular/core';
import { CampaignService } from '../services/campaign.service';
import { Thread, ThreadStatus, Timestamp, Feedback } from 'src/types/thread';

@Component({
    selector: 'app-media-thread',
    templateUrl: './media-thread.component.html',
    styleUrls: ['./media-thread.component.scss'],
})
export class MediaThreadComponent implements OnInit {

    @Input() mediaPath;

    allThreads: Thread[];
    shouldShowAddNewThread = false;

    newComment = '';
    constructor(
        public campaignService: CampaignService,
    ) { }

    async ngOnInit() {

        // const createThread = await this.campaignService.createThread(this.videoPath, 'start a new thread');
        // createThread.subscribe(thread => {
        //     console.log(thread);
        // });

        const getThread = await this.campaignService.getThread(this.mediaPath);
        getThread.subscribe(thread => {
            console.log(thread);
            thread.forEach(t => {
                t['showEdit'] = false;
                t.feedback_list = t.feedback_list.sort((f1, f2) => {
                    return f2.timestamp['_seconds'] - f1.timestamp['_seconds'];
                });
                t.feedback_list[t.feedback_list.length - 1].original = true;
            });
            this.allThreads = thread;
        });
    }

    async createComment() {
        const createThread = await this.campaignService.createThread(this.mediaPath, this.newComment);
        createThread.subscribe(thread => {
            const timestamp: Timestamp = {
                _seconds: new Date().getTime(),
                _nanoseconds: 0,
            };
            const threadStatus: ThreadStatus = {
                deleted: false,
                media_object_path: this.mediaPath,
                resolved: false,
                timestamp,
            };
            const feedback: Feedback = {
                like: 0,
                dislike: 0,
                extra_data: {},
                feedback_str: this.newComment,
                media_object_path: this.mediaPath,
                image_bounding_box: {},
                timestamp,
                video_offset: 0,
                original: true,
            };
            const newThread: Thread = {
                feedback_list: [feedback],
                thread_id: '',
                thread: threadStatus,
            };
            this.newComment = '';
            this.allThreads.splice(0, 0, newThread);
            console.log(thread);
        });
    }

    async replyThread(thread: Thread) {
        const replyThread = await this.campaignService.replyThread(this.mediaPath, this.newComment, thread.thread_id);
        replyThread.subscribe(response => {
            const timestamp: Timestamp = {
                _seconds: new Date().getTime(),
                _nanoseconds: 0,
            };
            const feedback: Feedback = {
                like: 0,
                dislike: 0,
                extra_data: {},
                feedback_str: this.newComment,
                media_object_path: this.mediaPath,
                image_bounding_box: {},
                timestamp,
                video_offset: 0,
            };
            thread.feedback_list.splice(0, 0, feedback);
            thread.feedback_list = [... thread.feedback_list];
            this.newComment = '';
            console.log(thread.feedback_list);
        });
    }

    showAddNewThread() {
        this.shouldShowAddNewThread = true;
        this.allThreads.forEach(t => {
            t['showEdit'] = false;
        });
    }

    showReplyThread(thread) {
        this.shouldShowAddNewThread = false;
        this.allThreads.forEach(t => {
            t['showEdit'] = false;
        });
        thread['showEdit'] = true;
    }

    trackItem(index: number, item: Feedback) {
        return JSON.stringify(item);
    }
}
