export interface Campaign {
    campaign_data: CampaignDetail;
    camapign_ref: string;
    campaign_name: string;
}

export interface CampaignData {
    campaign_historys: CampaignDetail[];
    final_history_id: string;
    final_campaign: CampaignDetail;
    final_video_draft_history_id: string;
    final_video_draft: CampaignDetail;
}

export interface CampaignDetail {
    content_concept?: string;
    image?: string;
    images?: any[];
    feed_back?: string;
    end_time: number;
    campaign_id?: string;
    time_stamp?: number;
    video?: string;
    brand: string;
    influencer_id?: string;
    campaign_name: string;
    contacts: string;
    commision_dollar: number;
    milestones?: string[];
    requirements?: string[];
    shipping_address?: string;
    tracking_number?: string;
    history_id?: string;
    extra_info?: string | CampaignExtraInfo;
}

export interface CampaignExtraInfo {
    type?: string;
    platform?: string;
    post_time?: number;
}


export interface VideoMetaData {
    resolution_height: number;
    text_reg_res: any[];
    transcoded: boolean;
    transcoded_path: string;
    uri: string;
}
