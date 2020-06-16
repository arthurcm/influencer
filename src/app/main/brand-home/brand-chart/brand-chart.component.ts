import { Component, OnInit, Input, OnChanges } from '@angular/core';
import { ChartDataSets, ChartOptions } from 'chart.js';
import { Label, Color } from 'ng2-charts';

import * as moment from 'moment';

@Component({
  selector: 'app-brand-chart',
  templateUrl: './brand-chart.component.html',
  styleUrls: ['./brand-chart.component.scss']
})
export class BrandChartComponent implements OnInit {
    @Input() chartData;
    currentDate: string;

    public lineChartData: ChartDataSets[] = [
        { 
            data: [65, 59, 80, 81, 56, 55, 40], 
            label: 'Revenue',
            yAxisID: 'left-y-axis'
        },
        {
            data: [165, 359, 820, 481, 56, 155, 240], 
            label: 'Visits',
            yAxisID: 'right-y-axis'
        },
    ];
    public lineChartLabels: Label[] = ['January', 'February', 'March', 'April', 'May', 'June', 'July'];
    public lineChartOptions: ChartOptions = {
        responsive: true,
        maintainAspectRatio: false,
        scales: {
            yAxes: [{
                id: 'left-y-axis',
                type: 'linear',
                position: 'left'
            }, {
                id: 'right-y-axis',
                type: 'linear',
                position: 'right'
            }]
        },
        tooltips: {
            intersect: false,
        }
    };
    public lineChartColors: Color[] = [
        {
            borderColor: 'rgb(123, 38, 218)',
            backgroundColor: 'rgb(123, 38, 218, 0.1)',
        },
        {
            borderColor: 'rgb(0, 113, 255)',
            backgroundColor: 'rgb(0, 113, 255, 0.1)',
        }
    ];
      public lineChartLegend = true;
      public lineChartType = 'line';
      public lineChartPlugins = [];
    

    constructor() { 
        
    }

    ngOnInit(): void {
        console.log(this.chartData);
        const revenue = this.chartData['revenue'];
        const visit = this.chartData['visit'];
        const dateList = [];
        const revenueList = [];
        const visitList = [];


        let currentTime = moment();

        this.currentDate = currentTime.format('YYYY-MM-DD');

        for (let i = 0; i < 15; i ++) {
            const stringDate = currentTime.format('YYYY-MM-DD');
            dateList.splice(0, 0, stringDate);
            revenueList.splice(0, 0, revenue[stringDate] ? revenue[stringDate] : 0);
            visitList.splice(0, 0, visit[stringDate] ? visit[stringDate] : 0);

            currentTime.subtract(1, 'day');
            
        }

        this.lineChartData[0].data = revenueList;
        this.lineChartData[1].data = visitList;
        this.lineChartLabels = dateList;

    }
}
