export interface Campaign {
    campaign_data: CampaignDetail,
    camapign_ref: string,
    campaign_name: string,
}

export interface CampaignDetail {
    content_concept?: string,
    image?: string,
    feed_back?: string,
    end_time: number,
    campaign_id?: string,
    time_stamp?: number,
    video?: string,
    brand: string,
    influencer_id?: string,
    campaign_name: string,
    contacts: string,
    commision_dollar: number,
    milestones?: string[],
}