export interface Campaign {
    campaign_data: CampaignDetail;
    camapign_ref: string;
    campaign_name: string;
    campaign_id: string;
    completed?: boolean;
}

export interface CampaignData {
    campaign_historys: CampaignDetail[];
    final_history_id: string;
    final_campaign: CampaignDetail;
    final_video_draft_history_id: string;
    final_video_draft: CampaignDetail;
}

export interface CampaignDetail {
    campaign_id?: string; // set on server side during creation.
    influencer_id: string; // set on server side during creation. Will be used for access control.
    brand: string; // crucial as shop name identifier for brand campaigns. Different from brand_id, which is used for firebase auth.
    brand_id: string; //  set on server side during creation. Crucial for brand initiated campaigns, Will be used for access control.
    brand_campaign_id?: string; // set on server side during creation.
    commission_type?: CommissionType;
    campaign_name: string;
    commission: number;
    commission_percentage: number;
    contacts: string;
    content_concept?: string;
    end_time: number;
    feed_back?: string;
    images?: any[];
    video?: string;
    milestones?: string[];
    requirements?: string[];
    extra_info?: string | CampaignExtraInfo;
    shipping_address?: string;
    tracking_number?: string;
    time_stamp?: number;
    history_id?: string; // set on server side during creation and updates
    ended?: boolean;
    deleted?: boolean;
    collaborating_influencers?: string[];
    website?: string;
}

export interface CampaignExtraInfo {
    type?: string;
    platform?: string;
    post_time?: number;
    contracts: UploadFile[];
}


export interface VideoMetaData {
    resolution_height: number;
    text_reg_res: any[];
    transcoded: boolean;
    transcoded_path: string;
    uri: string;
}

export interface UploadFile {
    url: string;
    path: string;
}

export interface ImageContent {
    images: UploadFile[];
    caption: string;
}

export enum CommissionType {
    PER_SALES = 'Per Sales Commission',
    ONE_TIME_PAY = 'One Time Payment',
    FIX_PAY_PLUS_PER_SALES = 'Fixed Pay + Per Sales Commision',
}
