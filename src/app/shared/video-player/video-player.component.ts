import { Component, OnInit, ViewChild, Input, Output } from '@angular/core';
import { Subscription, timer } from 'rxjs';
import { BitrateOption, VgAPI, IDRMLicenseServer, VgDASH, VgHLS } from 'ngx-videogular';
import { EventEmitter } from 'events';

export interface IMediaStream {
    type: 'vod' | 'dash' | 'hls';
    source: string;
    label: string;
    token?: string;
    licenseServers?: IDRMLicenseServer;
}

@Component({
    selector: 'app-video-player',
    templateUrl: './video-player.component.html',
    styleUrls: [ './video-player.component.scss' ],
})
export class VideoPlayerComponent implements OnInit {
    @Input() inputSources: [];
    @ViewChild(VgDASH) vgDash: VgDASH;
    @ViewChild(VgHLS) vgHls: VgHLS;

    currentStream: IMediaStream;
    api: VgAPI;

    bitrates: BitrateOption[];

    streams: IMediaStream[] = [
        {
            type: 'vod',
            label: 'VOD',
            source: 'http://static.videogular.com/assets/videos/videogular.mp4',
        },
        {
            type: 'dash',
            label: 'DASH: Multi rate Streaming',
            source: 'http://dash.edgesuite.net/akamai/bbb_30fps/bbb_30fps.mpd',
        },
        {
            type: 'dash',
            label: 'DASH: Live Streaming',
            source: 'https://24x7dash-i.akamaihd.net/dash/live/900080/dash-demo/dash.mpd',
        },
        {
            type: 'dash',
            label: 'DASH: DRM with Widevine',
            source: 'https://storage.googleapis.com/shaka-demo-assets/angel-one-widevine/dash.mpd',
            licenseServers: {
                'com.widevine.alpha': {
                    serverURL: 'https://widevine-proxy.appspot.com/proxy',
                },
            },
        },
        {
            type: 'hls',
            label: 'HLS: Streaming',
            source: 'https://d2zihajmogu5jn.cloudfront.net/bipbop-advanced/bipbop_16x9_variant.m3u8',
        },
    ];

    sources = [];

    constructor() {
    }

    onPlayerReady(api: VgAPI) {
        this.api = api;
    }

    ngOnInit() {
        this.currentStream = this.streams[ 0 ];
        this.sources = this.inputSources;
    }

    setBitrate(option: BitrateOption) {
        switch (this.currentStream.type) {
        case 'dash':
            this.vgDash.setBitrate(option);
            break;

        case 'hls':
            this.vgHls.setBitrate(option);
            break;
        }
    }

    onClickStream(stream: IMediaStream) {
        this.api.pause();
        this.bitrates = null;

        const clicktimer: Subscription = timer(0, 10).subscribe(
            () => {
                this.currentStream = stream;
                clicktimer.unsubscribe();
            }
        );
    }

    getCurrentSecond() {
        return this.api.getDefaultMedia().currentTime;
    }
}
