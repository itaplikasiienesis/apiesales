


const { calculateLimitAndOffset, paginate } = require("paginate-info");
const uuid = require("uuid/v4");
const otpGenerator = require('otp-generator');
const mssql = require('mssql');
const moment = require('moment');
const xml2js = require('xml2js');
const numeral = require('numeral');
const bcrypt = require('bcryptjs');
const path = require('path');
const Client = require('ftp');
const fs = require('fs');
const ClientSFTP = require('ssh2-sftp-client');
const dokumentPath = (param2, param3) => path.resolve(sails.config.appPath, 'repo', param2, param3);
const _ = require('lodash');

module.exports = {
  // GET ALL RESOURCE

  find: async function(req, res) {
    const {
        query: {plant,bulan_tahun,m_user_id,machine_id}
    } = req;
    await DB.poolConnect;
    try {
      const request = DB.pool.request();

      
      let tahun = moment(bulan_tahun,'YYYYMM').format('YYYY');
      let bulan = moment(bulan_tahun,'YYYYMM').format('MM');
      let bulan_tahun_label = moment(bulan_tahun,'YYYYMM').format('MMM-YY');
      let bulan_number = moment(bulan_tahun,'YYYYMM').format('M');

     
      let queryData = `select day(date) as date, plant_id, machine_id, COALESCE(cast(avg(avgoee) AS DECIMAL(38,4)),0) as poee, 
      COALESCE(cast(avg(totloss) AS DECIMAL(38,4)),0) as tloss, COALESCE(cast(avg(countloss) AS DECIMAL(38,4)),0) as closs, 
      COALESCE(cast(avg(totloss) AS DECIMAL(38,4)),0) / CASE WHEN COALESCE(cast(avg(countloss) AS DECIMAL(38,4)),0) > 0 THEN COALESCE(cast(avg(countloss) AS DECIMAL(38,4)),0) ELSE 1 END  as avgdt      from v_oee_lossdtl
      where plant_id='${plant}'
      and YEAR([date])= '${tahun}'
      AND MONTH([date])= ${bulan_number}
      and machine_id='${machine_id}'
      group by date, plant_id, machine_id
      order by date asc`;

      console.log(queryData);

      let dataFromQuery = await request.query(queryData);
      let data = dataFromQuery.recordset;

      var ddate02a = [];
      var poee02a = [];
      var avgdt02a = [];
      var pcloss02a = [];
      var tloss = [];


      for (var i in data) {

              ddate02a.push(pad(data[i].date));				
              poee02a.push(data[i].poee);
              avgdt02a.push((data[i].avgdt /60 ).toFixed(1));
              tloss.push((data[i].tloss /60 ).toFixed(1));
              pcloss02a.push(data[i].closs);

      }


      let chartDataOEEvsLostTime = {
        labels: ddate02a,
        datasets: [
        {
            label: "OEE",
            borderColor: 'red',
            borderWidth: 2,
            fill: true,
            yAxisID: 'y-axis-1',
            type: 'line',
            pointRadius: 3,
            pointHoverRadius: 2,
            data: poee02a
        },
        {
            label: "AVG (hr)",
            borderColor: 'green',
            borderWidth: 2,
            fill: false,
            yAxisID: 'y-axis-1',
            type: 'line',
            pointRadius: 3,
            pointHoverRadius: 2,
            data: avgdt02a
        },
        {
            label: "Total Downtime (Hour)",
            fill: false,
            lineTension: 0.1,
            backgroundColor: 'rgba(255,0,128)',
            borderColor: 'rgba(255,0,128)',
            borderWidth:1,
            pointHoverBackgroundColor: "rgba(59, 89, 152, 1)",
            pointHoverBorderColor: "rgba(59, 89, 152, 1)",
            yAxisID: 'y-axis-2',
            datalabels: {
                align: 'start',
                anchor: 'end'
            },
            data: tloss
        },
        {
            label: "Freq Loss",
            fill: false,
            lineTension: 0.1,
            backgroundColor: 'blue',
            borderColor: 'blue',
            borderWidth:1,
            pointHoverBackgroundColor: "rgba(59, 89, 152, 1)",
            pointHoverBorderColor: "rgba(59, 89, 152, 1)",
            stack: 'Stack 1',
            yAxisID: 'y-axis-2',
            datalabels: {
                align: 'start',
                anchor: 'end'
            },
            data: pcloss02a
        }
      ]
    }


    let chartOptionsOEEvsLostTime = {
        maintainAspectRatio : false,
        responsive: true,
        scales: {
            xAxes: [{
                stacked: true,
            }],
            yAxes: [
                {
                    scaleLabel: {
                        display: true,
                        labelString: 'Time (Hour), Freq'
                    },
                    display: true,
                    position: 'left',
                    id: 'y-axis-2',
                }, 
                {
                    scaleLabel: {
                        display: true,
                        labelString: 'Percentage (%)'
                    },
                    display: true,
                    position: 'right',
                    id: 'y-axis-1',
                    gridLines: {
                        drawOnChartArea: false
                    }
                }
            ],
        },
        title: {
            display: true,
            text: `OEE vs LOSS TIME, ${plant}, ${bulan_tahun_label}`
        },
        tooltips: {
            mode: 'index',
            footerFontStyle: 'normal'
        },
        hover: {
            mode: 'index',
            intersect: false
        }
    }


    let myChart = {
        chartDataOEEvsLostTime:chartDataOEEvsLostTime,
        chartOptionsOEEvsLostTime:chartOptionsOEEvsLostTime
    }

      return res.success({
        result: myChart,
        message: "Fetch data successfully"
      });


    } catch (err) {
      return res.error(err);
    }
  },

  findByTimeYear: async function(req, res) {

    const {
        query: {plant,bulan_tahun,m_user_id,machine_id}
    } = req;
    await DB.poolConnect;
    try {
      const request = DB.pool.request();
    
      
      let tahun = moment(bulan_tahun,'YYYYMM').format('YYYY');
      let bulan = moment(bulan_tahun,'YYYYMM').format('MM');
      let bulan_tahun_label = moment(bulan_tahun,'YYYYMM').format('MMM-YY');

      let queryData = `select format([date], 'MMM-yy') as period, plant_id, machine_id, 
      COALESCE(cast(avg(avgoee) AS DECIMAL(38,4)),0) as poee, COALESCE(cast(sum(totloss)/60 AS DECIMAL(38,4)),0) as tloss, COALESCE(sum(countloss),0) as closs,
      COALESCE(cast(avg(totloss) AS DECIMAL(38,4)),0) / CASE WHEN COALESCE(cast(avg(countloss) AS DECIMAL(38,4)),0) > 0 THEN COALESCE(cast(avg(countloss) AS DECIMAL(38,4)),0) ELSE 1 END  as avgdt
      from v_oee_lossdtl
      where plant_id='${plant}'
      and YEAR([date])= '${tahun}'
      and machine_id='${machine_id}'
      group by format([date], 'MMM-yy'), plant_id, machine_id
      order by format([date], 'MMM-yy') asc`;

     

      let dataFromQuery = await request.query(queryData);
      let data = dataFromQuery.recordset;
      
      var ddate02a = [];
      var poee02a = [];
      var avgdt02a = [];
      var pcloss02a = [];
      var ptloss02a = [];


      for (var i in data) {

              ddate02a.push(data[i].period);				
              poee02a.push(data[i].poee);
              avgdt02a.push((data[i].avgdt/60).toFixed(1));
              ptloss02a.push(data[i].tloss);		
              pcloss02a.push(data[i].closs);

      }


    let chartDataOEEvsLostTimeYear = {
        labels: ddate02a,
        datasets: [
        {
            label: "OEE",
            borderColor: 'red',
            borderWidth: 2,
            fill: true,
            yAxisID: 'y-axis-1',
            type: 'line',
            pointRadius: 3,
            pointHoverRadius: 2,
            data: poee02a
        },
        {
            label: "Total Downtime (Hour)",
            fill: false,
            lineTension: 0.1,
            backgroundColor: 'rgba(255,0,128)',
            borderColor: 'rgba(255,0,128)',
            borderWidth:1,
            pointHoverBackgroundColor: "rgba(59, 89, 152, 1)",
            pointHoverBorderColor: "rgba(59, 89, 152, 1)",
            yAxisID: 'y-axis-2',
            data: ptloss02a
        },
        {
            label: "Freq Loss",
            fill: false,
            lineTension: 0.1,
            backgroundColor: 'blue',
            borderColor: 'blue',
            borderWidth:1,
            pointHoverBackgroundColor: "rgba(59, 89, 152, 1)",
            pointHoverBorderColor: "rgba(59, 89, 152, 1)",
            stack: 'Stack 1',
            yAxisID: 'y-axis-2',
            data: pcloss02a
        }
      ]
    };

    let chartOptionsOEEvsLostTimeYear = {
        maintainAspectRatio : false,
        responsive: true,
        scales: {
            xAxes: [{
                stacked: true,
            }],
            yAxes: [
                {
                    scaleLabel: {
                        display: true,
                        labelString: 'Time (Hour), Freq'
                    },
                    display: true,
                    position: 'left',
                    id: 'y-axis-2',
                }, 
                {
                    scaleLabel: {
                        display: true,
                        labelString: 'Percentage (%)'
                    },
                    display: true,
                    position: 'right',
                    id: 'y-axis-1',
                    gridLines: {
                        drawOnChartArea: false
                    }
                }
            ],
        },
        title: {
            display: true,
            text: 'OEE vs LOSS TIME, '+machine_id+'-'+bulan_tahun_label
        },
        tooltips: {
            mode: 'index',
            footerFontStyle: 'normal'
        },
        hover: {
            mode: 'index',
            intersect: false
        }
    };

    let myChart = {
        chartDataOEEvsLostTimeYear:chartDataOEEvsLostTimeYear,
        chartOptionsOEEvsLostTimeYear:chartOptionsOEEvsLostTimeYear
    }

    return res.success({
        result: myChart,
        message: "Fetch data successfully"
    });


    } catch (err) {
      return res.error(err);
    }
  },


  findLossDowntime: async function(req, res) {

    const {
        query: {plant,bulan_tahun,m_user_id,machine_id}
    } = req;
    await DB.poolConnect;
    try {
      const request = DB.pool.request();
    
      
      let tahun = moment(bulan_tahun,'YYYYMM').format('YYYY');
      let bulan = moment(bulan_tahun,'YYYYMM').format('MM');
      let bulan_tahun_label = moment(bulan_tahun,'YYYYMM').format('MMM-YY');
      let bulan_number = moment(bulan_tahun,'YYYYMM').format('M');

      let queryData = `  select sum(m.loss_time) as tloss, CONCAT(l.kode,'. ',l.nama) as lossname  
      from oee_losstbl m, m_bigloses l, mst_settings s, oee_machinetbl x
      where m.loss_id=l.kode 
      and m.machine_id=x.machine_id
      and m.plant_id=x.plant
      and s.val_tag='MAJOR_LOSS'
      and s.val_id=l.loss_cat
      and m.machine_id='${machine_id}'
      and m.plant_id='${plant}'
      and YEAR(m.rundate)= '${tahun}'
      and MONTH(m.rundate)= ${bulan_number}
      group by l.kode , l.nama`;


      console.log(queryData);

      let dataFromQuery = await request.query(queryData);
      let data = dataFromQuery.recordset;
      
      var vtloss = [];
      var vlossname = [];
      
      for (var i in data) {
              vlossname.push(data[i].lossname);
              vtloss.push((data[i].tloss/60).toFixed(1));
      }

    let chartDataTotalDowntime = {
        labels: vlossname,
        datasets: [
        {
            backgroundColor: ['#41B883', '#E46651', '#00D8FF', '#DD1B16'],
            data: vtloss
        }
        ]
    };

    let chartOptionsTotalDowntime = {
        maintainAspectRatio : false,
        responsive: true,
        title: {
            display: true,
            text: 'TOTAL DOWNTIME (HOUR), TP09-Jul-22'
        },
        hover: {
            mode: 'index',
            intersect: false
        }
    };

    let myChart = {
        chartDataTotalDowntime:chartDataTotalDowntime,
        chartOptionsTotalDowntime:chartOptionsTotalDowntime
    }

    return res.success({
        result: myChart,
        message: "Fetch data successfully"
    });


    } catch (err) {
      return res.error(err);
    }
  },



  
}


function pad(d) {
    var str = "" + d
    var pad = "00"
    var ans = pad.substring(0, pad.length - str.length) + str
    return ans;
  }