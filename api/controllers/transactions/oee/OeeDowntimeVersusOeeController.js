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
const { _ } = require("lodash");
const dokumentPath = (param2, param3) => path.resolve(sails.config.appPath, 'repo', param2, param3);


module.exports = {
  // GET ALL RESOURCE
  find: async function(req, res) {
    const {
      query: {plant,bulan_tahun,m_user_id}
    } = req;

    console.log(req.query);
    await DB.poolConnect;
    try {
      const request = DB.pool.request();

      let tahun = moment(bulan_tahun,'YYYYMM').format('YYYY');
      let tahun_yy = moment(bulan_tahun,'YYYYMM').format('YY');
      let tahun_label = moment(bulan_tahun,'YYYYMM').format('YY');



      let queryData = `SELECT format(a.date, 'MMM-yy') AS periode,cd.[month],
      (case when a.plant_id is null then '${plant}' else a.plant_id end) as plnt, 
      COALESCE(CAST(avg(a.avgoee) AS DECIMAL(38,4)),0) AS oee, COALESCE((sum(a.totLoss)/60),0) AS losshour,
      COALESCE(sum(a.countloss),0) AS freqdowntime
      FROM calendar_date cd,v_oee_lossdtl a WHERE a.plant_id = '${plant}' 
      AND cd.[month] = MONTH(a.[date])
      AND cd.[year] = '${tahun}'
      group by format(a.date, 'MMM-yy'),
      cd.[month],a.plant_id 
      ORDER BY cd.[month]`;

      console.log(queryData);

      let dataFromQuery = await request.query(queryData);
      let data = dataFromQuery.recordset;

      for (let i = 1; i <= 12; i++) {
        
        let cekbulan = data.find(e => e.month == i);
        if(!cekbulan){


            let bulan_periode = getMonth(i);

            let obj = {

                periode:    `${bulan_periode}-${tahun_yy}`,
                month: i,
                plnt: plant,
                oee: 0,
                losshour: 0,
                freqdowntime: 0
            }

            data.push(obj);


        }
        
      }

      data = _.orderBy(data,['month'])

      console.log(data);

      var periode = [];
      var plnt = [];
      var oee = [];
      var losshour=[];
      var freqdowntime = [];

      
    for (var i in data) {

            periode.push(data[i].periode);
            plnt.push(data[i].plnt);
            oee.push(data[i].oee);
            losshour.push(parseInt(data[i].losshour));
            freqdowntime.push(data[i].freqdowntime);
    }

      let chartDataLossAll = {
        labels: [
            `Jan-${tahun_label}`, `Feb-${tahun_label}`, `Mar-${tahun_label}`, `Apr-${tahun_label}`, `May-${tahun_label}`, `Jun-${tahun_label}`, `Jul-${tahun_label}`, `Aug-${tahun_label}`, `Sept-${tahun_label}`, `Oct-${tahun_label}`, `Nov-${tahun_label}`, `Dec-${tahun_label}`
          ],        
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
            data: oee
          },
          {
            label: "Loss Time (hour)",
            fill: false,
            lineTension: 0.1,
            backgroundColor: 'blue',
            borderColor: 'blue',
            borderWidth:1,
            pointHoverBackgroundColor: "rgba(59, 89, 152, 1)",
            pointHoverBorderColor: "rgba(59, 89, 152, 1)",
            yAxisID: 'y-axis-2',
            data: losshour
          },
          {
            label: "Freq. Downtime",
            fill: false,
            lineTension: 0.1,
            backgroundColor: 'green',
            borderColor: 'green',
            borderWidth:1,
            pointHoverBackgroundColor: "rgba(59, 89, 152, 1)",
            pointHoverBorderColor: "rgba(59, 89, 152, 1)",
            stack: 'Stack 1',
            yAxisID: 'y-axis-2',
            data:freqdowntime
          }
        ]
      }


      let chartOptionsLossAll = {
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
                labelString: 'Time (Hour)'
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
          text: `DATA LOSS TIME PLANT ${plant} YEAR ${tahun}`
        },
        tooltips: {
          mode: 'index',
          footerFontStyle: 'normal'
        },
        hover: {
          mode: 'index',
          intersect: true
        }
      }


      let datachart = {
        chartDataLossAll:chartDataLossAll,
        chartOptionsLossAll
      }


      console.log(datachart);


      return res.success({
        result:datachart
      });


    } catch (err) {
      return res.error(err);
    }
  },
  
  findAvgVersusOeeDowntime: async function(req, res) {
    const {
      query: {plant,bulan_tahun,m_user_id}
    } = req;

    console.log(req.query);
    await DB.poolConnect;
    try {
      const request = DB.pool.request();

      let tahun = moment(bulan_tahun,'YYYYMM').format('YYYY');
      let bulan = moment(bulan_tahun,'YYYYMM').format('MM');
      let bulan_tahun_label = moment(bulan_tahun,'YYYYMM').format('MMM-YY');



      let queryData = `select day(date) as hari, plant_id, COALESCE(cast(avg(avgoee) AS DECIMAL(38,4)),0) as poee, COALESCE(cast(sum(totloss)/60 AS DECIMAL(38,4)),0) as tloss, COALESCE(sum(countloss),0) as closs, 
      COALESCE(cast(((sum(totloss)) / sum(countloss)) AS DECIMAL(38,4)),0) as avgdt
      from v_oee_lossdtl
      where plant_id='${plant}'
      and YEAR([date])= '${tahun}'
      AND MONTH([date])= '${bulan}'
      group by date, plant_id
      order by date asc`;


      console.log(queryData);

      let dataFromQuery = await request.query(queryData);
      let data = dataFromQuery.recordset;

      var ddate02a = [];
      var poee02a = [];
      var avgdt02a = [];
      var pcloss02a = [];



      for (let i = 0; i < data.length; i++) {
        let hari = pad(data[i].hari);
        ddate02a.push(hari);				
        poee02a.push(data[i].poee);
        avgdt02a.push((data[i].avgdt/60).toFixed(1));
        pcloss02a.push(data[i].closs);
      }



      let chartDataOEEvsAVG = {
						labels: ddate02a,
						datasets: [
                {
                label: "OEE",
                borderColor: 'red',
                backgroundColor: 'red',
                borderWidth: 2,
                fill: false,
                yAxisID: 'y-axis-1',
                type: 'line',
                pointRadius: 3,
                pointHoverRadius: 2,
                data: poee02a
								},
								{
								label: "Total Loss/Freq (Hour)",
								fill: false,
								lineTension: 0.1,
                backgroundColor: 'yellow',
								borderColor: 'yellow',
								borderWidth:1,
								pointHoverBackgroundColor: "rgba(59, 89, 152, 1)",
								pointHoverBorderColor: "rgba(59, 89, 152, 1)",
								yAxisID: 'y-axis-2',
								data: avgdt02a
								}]
					};


    let chartOptionsOEEvsAVG = {
            maintainAspectRatio : false,
            responsive: true,
            legend: {
              position: 'top',
              display: true,
              labels: {
                usePointStyle: true,
                padding:25,                           
                boxWidth: 8
              }
            },
            scales: {
              xAxes: [{
                display: true,
                scaleLabel: {
                  display: true,
                  labelString: bulan_tahun_label
                }
              }],
              yAxes: [
                {
                  scaleLabel: {
                    display: true,
                    labelString: 'Time (Hour)'
                  },
                  type: 'linear', // only linear but allow scale type registration. This allows extensions to exist solely for log scale for instance
                  display: true,
                  position: 'left',
                  id: 'y-axis-2',
                },
                {
                  scaleLabel: {
                    display: true,
                    labelString: 'Percentage (%)'
                  },
                  type: 'linear', // only linear but allow scale type registration. This allows extensions to exist solely for log scale for instance
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
              text: `OEE vs AVG LOSS TIME, ${plant}, ${bulan_tahun_label}`
            },
            tooltips: {
              mode: 'index',
              intersect: false
            },
            hover: {
              mode: 'nearest',
              intersect: true
            }
          }

        
      
      let myChart = {
        chartDataOEEvsAVG : chartDataOEEvsAVG,
        chartOptionsOEEvsAVG : chartOptionsOEEvsAVG
      }

      return res.success({
        result:myChart
      });


    } catch (err) {
      return res.error(err);
    }
  },
  findTopLowest: async function(req, res) {
    const {
      query: {plant,bulan_tahun,m_user_id}
    } = req;

    console.log(req.query);
    await DB.poolConnect;
    try {
      const request = DB.pool.request();

      let tahun = moment(bulan_tahun,'YYYYMM').format('YYYY');
      let bulan = moment(bulan_tahun,'YYYYMM').format('MM');
      let tahun_label = moment(bulan_tahun,'YYYYMM').format('YY');



      let queryData = `select top 10 ml.plant_id, ml.attrib1, 
      ml.machine_id as machineid, me.machine_name as machinename, sum(ml.tloss) as sumloss, count(ml.closs) as countloss
      from v_machine_lossdtl ml, oee_machinetbl me
      where ml.plant_id='${plant}'
      and YEAR(rundate)= '${tahun}'
      AND MONTH(rundate)= '${bulan}'
      and ml.machine_id=me.machine_id
      and ml.plant_id=me.plant
      GROUP BY YEAR(rundate),MONTH(rundate), ml.plant_id, ml.attrib1, ml.machine_id,me.machine_name 
      order by sumloss desc`;


      let dataFromQuery = await request.query(queryData);
      let data = dataFromQuery.recordset;

      var tperiod = [];
      var tplant_id=[];					
      var tline=[];
      var tmachineid=[];
      var tmachinename=[];
      var tsumloss = [];
      var tcountloss = [];


      for (let i = 0; i < data.length; i++) {
        tperiod.push(data[i].period);
        tplant_id.push(data[i].plant_id);
        tline.push(data[i].attrib1);
        tmachineid.push(data[i].machineid);
        tmachinename.push(data[i].machinename);
        tsumloss.push((data[i].sumloss/60).toFixed(1));  // (lsummloss[i]/60).toFixed(1)
        tcountloss.push(data[i].countloss);
      }      

      let chartDataMachineBD = {
          labels: tmachinename,
          datasets: [
            {
              label: "Total Loss (hour)",
              backgroundColor: 'red',
              borderWidth: 2,
              fill: true,
              pointRadius: 3,
              pointHoverRadius: 2,
              data: tsumloss	
            },
            {
              label: "Frequency Loss",
              backgroundColor: 'blue',
              borderWidth: 2,
              fill: true,
              pointRadius: 3,
              pointHoverRadius: 2,
              data: tcountloss	
            }
          ]
        }

        let chartOptionsMachineBD = {
          maintainAspectRatio : false,
          responsive: true,
          legend: {
            display: true,
            position: 'top',
            align: 'end',
            labels: {
              usePointStyle: true,
              padding:25,                           
              boxWidth: 8
            }
          },
          scales: {
            xAxes: [
              {
                display: true,
                scaleLabel: {
                  display: true,
                  labelString: 'Hour/Freq'    
                }
              }
            ],
            yAxes: [
              {
                gridLines : {
                  display : false,
                },
                display: true,
                scaleLabel: {
                  display: false
                },
                ticks: {
                  beginAtZero: true,
                }
              }
            ],
          },
          title: {
            display: true,
            text: `TOP 10 MACHINE BREAKDOWN ${plant}, ${bulan}`
          },
        }

        
      
      let myChart = {
        chartDataMachineBD : chartDataMachineBD,
        chartOptionsMachineBD : chartOptionsMachineBD
      }

      return res.success({
        result:myChart
      });


    } catch (err) {
      return res.error(err);
    }
  },
  findDetailDonwtime: async function(req, res) {
    const {
      query: {plant,bulan_tahun,m_user_id}
    } = req;

    console.log(req.query);
    await DB.poolConnect;
    try {
      const request = DB.pool.request();

      let tahun = moment(bulan_tahun,'YYYYMM').format('YYYY');
      let bulan = moment(bulan_tahun,'YYYYMM').format('MM');

      let queryData = `select format([date], 'MMM-yy') as periode, plant_id, line,  COALESCE(cast(avg(avgoee) AS DECIMAL(38,4)),0) as oee, 
      COALESCE(cast(sum(totloss)/60 AS DECIMAL(38,4)),0) as tloss, COALESCE(sum(countloss),0) as closs
      from v_oee_lossdtl
      where plant_id='${plant}'
            and YEAR([date])='${tahun}'
            AND MONTH([date])='${bulan}'
      group by format([date], 'MMM-yy'), plant_id, line`

      let dataFromQuery = await request.query(queryData);
      let data = dataFromQuery.recordset;


      var pplant02b = [];
      var pline02b = [];
      var poee02b = [];
      var ptloss02b = [];
      var pcloss02b = [];
      var href;


      for (let i = 0; i < data.length; i++) {
        pplant02b.push(data[i].plant_id);
        pline02b.push(data[i].line);
        poee02b.push(data[i].oee);
        ptloss02b.push(parseInt(data[i].tloss));
        pcloss02b.push(data[i].closs);

      }      

    let chartDataDetailDowntime = {
        labels: pline02b,
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
            data: poee02b
          },
          {
            label: "TOTAL LOSS (Hour)",
            fill: false,
            lineTension: 0.1,
            backgroundColor: 'blue',
            borderColor: 'blue',
            borderWidth:1,
            pointHoverBackgroundColor: "rgba(59, 89, 152, 1)",
            pointHoverBorderColor: "rgba(59, 89, 152, 1)",
            yAxisID: 'y-axis-2',
            data: ptloss02b
          },
          {
            label: "FREQ. LOSS (Times)",
            fill: false,
            lineTension: 0.1,
            backgroundColor: 'green',
            borderColor: 'green',
            borderWidth:1,
            pointHoverBackgroundColor: "rgba(59, 89, 152, 1)",
            pointHoverBorderColor: "rgba(59, 89, 152, 1)",
            stack: 'Stack 1',
            yAxisID: 'y-axis-2',
            data: pcloss02b
          },
        ]
      }

      

      let chartOptionsDetailDowntime = {
        scales: {
          xAxes: [{
            stacked: true,
          }],
          yAxes: [
            {
              scaleLabel: {
                display: true,
                labelString: 'Time (Hour)'
              },
              type: 'linear', // only linear but allow scale type registration. This allows extensions to exist solely for log scale for instance
              display: true,
              position: 'left',
              id: 'y-axis-2',
            }, 
            {
              scaleLabel: {
                display: true,
                labelString: 'Percentage (%)'
              },
              type: 'linear', // only linear but allow scale type registration. This allows extensions to exist solely for log scale for instance
              display: true,
              ticks: {
                beginAtZero: true,
              },
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
          text: `DETAIL DOWNTIME PLANT ${plant}, ${bulan}`
        },
        tooltips: {
          mode: 'index',
          footerFontStyle: 'normal'
        },
        hover: {
          mode: 'index',
          intersect: true
        }
      }


      
      
      let myChart = {
        chartDataDetailDowntime : chartDataDetailDowntime,
        chartOptionsDetailDowntime : chartOptionsDetailDowntime
      }


      return res.success({
        result:myChart
      });


    } catch (err) {
      return res.error(err);
    }
  },
}


function getMonth(month){


    if(month==1){
        return 'Jan';
    }else if(month==2){
        return 'Feb';
    }else if(month==3){
       return 'Mar';
    }else if(month==4){
        return 'Apr';
    }else if(month==5){
        return 'May';
    }else if(month==6){
        return 'Jun';
    }else if(month==7){
        return 'Jul';
    }else if(month==8){
        return 'Aug';
    }else if(month==9){
        return 'Sep';
    }else if(month==10){
        return 'Oct';
    }else if(month==11){
        return 'Nov';
    }else if(month==12){
        return 'Dec';
    }


}


function pad(d) {
  var str = "" + d
  var pad = "00"
  var ans = pad.substring(0, pad.length - str.length) + str
  return ans;
}