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


module.exports = {
  // GET ALL RESOURCE
  find: async function(req, res) {
    const {
      query: {plant,bulan_tahun,m_user_id}
    } = req;

    // console.log(req.query);
    await DB.poolConnect;
    try {
      const request = DB.pool.request();

    
      let tahun = moment(bulan_tahun,'YYYYMM').format('YYYY');
      let bulan = moment(bulan_tahun,'YYYYMM').format('MM');


      let tahun_min_satu = moment(bulan_tahun,'YYYYMM').add(-1,'M').format('YYYY');
      let bulan_min_satu = moment(bulan_tahun,'YYYYMM').add(-1,'M').format('MM');

      let periodPresent = moment(bulan_tahun,'YYYYMM').format('MMM-YY');
      let periodLast = moment(bulan_tahun,'YYYYMM').add(-1,'M').format('MMM-YY');


      let bulan_present = moment(bulan_tahun,'YYYYMM').add(-1,'M').format('M');
      let bulan_last = moment(bulan_tahun,'YYYYMM').add(-1,'M').format('M');

      let sqlGetLinePerArea = `SELECT DISTINCT attrib1,deskripsi,color FROM oee_machinetbl om WHERE plant ='${plant}'`;
      // console.log(sqlGetLinePerArea);
      let getLinePerArea = await request.query(sqlGetLinePerArea);
      let lineArea = getLinePerArea.recordset;

      let dataMesinOeeTerendah = [];
      let datalabelNilaiOee = [];
      let datalabel = [];
      let dataoeelast_arr = [];
      let dataoeepresent_arr = [];
      let target_arr = [];
      let datasets_arr = [];

      for (let i = 0; i < lineArea.length; i++) {
        let kategori = lineArea[i].attrib1;
        let deskripsi = lineArea[i].deskripsi;
        let color = lineArea[i].color;
        datalabelNilaiOee.push(deskripsi);

        // let sqlGetMesinOeeTerendahPresentKategori = `
        // SELECT TOP 1 vro.line,vro.machine_id,mcn.machine_name,COALESCE(AVG(OEE1),0) AS OEE,COALESCE(AVG(AR1),0) AS AR,COALESCE(AVG(PR1),0) AS PR,COALESCE(AVG(QR1),0) AS QR
        // FROM v_raw_oees vro 
        // LEFT JOIN oee_machinetbl mcn ON(mcn.machine_id = vro.machine_id)
        // where MONTH(rundate)=${bulan} AND YEAR(rundate)=${tahun}  and plant_id='${plant}' 
        // AND vro.line ='${kategori}' AND vro.m_area='FILL'
        // AND vro.OEE1 IS NOT NULL 
        // GROUP BY vro.line,vro.machine_id,mcn.machine_name ORDER BY COALESCE(AVG(OEE1),0)`;


        let sqlGetMesinOeeTerendahPresentKategori = `SELECT TOP 1 vro.line,vro.machine_id,mcn.machine_name,COALESCE(AVG(OEE1),0) AS OEE,COALESCE(AVG(AR1),0) AS AR,COALESCE(AVG(PR1),0) AS PR,COALESCE(AVG(QR1),0) AS QR
        FROM v_raw_oees vro
        LEFT JOIN oee_machinetbl mcn ON(mcn.machine_id = vro.machine_id)
        WHERE MONTH(rundate)=${bulan} AND YEAR(rundate)=${tahun}  and plant_id='${plant}' 
        AND vro.line ='${kategori}' AND vro.m_area='FILL'
        AND vro.OEE1 IS NOT NULL
        GROUP BY vro.line,vro.machine_id,mcn.machine_name ORDER BY COALESCE(AVG(OEE1),0)`;
        


        // console.log(sqlGetMesinOeeTerendahPresentKategori);

        let getdatamesinoee = await request.query(sqlGetMesinOeeTerendahPresentKategori);
        let datadatamesinoee = getdatamesinoee.recordset;


        


        // let sqlGetMesinOeeTerendahLastKategori = `
        // SELECT TOP 1 vro.line,vro.machine_id,mcn.machine_name,COALESCE(AVG(OEE1),0) AS OEE,COALESCE(AVG(AR1),0) AS AR,COALESCE(AVG(PR1),0) AS PR,COALESCE(AVG(QR1),0) AS QR FROM v_raw_oees vro 
        // LEFT JOIN oee_machinetbl mcn ON(mcn.machine_id = vro.machine_id)
        // WHERE MONTH(rundate)=${bulan_min_satu} AND YEAR(rundate)=${tahun_min_satu}  and plant_id='${plant}' 
        // AND vro.line ='${kategori}' AND vro.m_area='FILL'
        // AND vro.OEE1 IS NOT NULL 
        // GROUP BY vro.line,vro.machine_id,mcn.machine_name ORDER BY COALESCE(AVG(OEE1),0)`;


        let sqlGetMesinOeeTerendahLastKategori = `SELECT TOP 1 vro.line,vro.machine_id,mcn.machine_name,COALESCE(AVG(OEE1),0) AS OEE,COALESCE(AVG(AR1),0) AS AR,COALESCE(AVG(PR1),0) AS PR,COALESCE(AVG(QR1),0) AS QR
        FROM v_raw_oees vro
        LEFT JOIN oee_machinetbl mcn ON(mcn.machine_id = vro.machine_id)
        WHERE MONTH(rundate)=${bulan_min_satu} AND YEAR(rundate)=${tahun_min_satu}  and plant_id='${plant}' 
        AND vro.line ='${kategori}' AND vro.m_area='FILL'
        AND vro.OEE1 IS NOT NULL
        GROUP BY vro.line,vro.machine_id,mcn.machine_name ORDER BY COALESCE(AVG(OEE1),0)`;
        

        let getdatamesinoeelast = await request.query(sqlGetMesinOeeTerendahLastKategori);
        let datadatamesinoeelast = getdatamesinoeelast.recordset;


        // console.log(datadatamesinoeelast);
        // console.log(datadatamesinoee);


        let datakategori = null;
        let panjangdata = datadatamesinoee.length > datadatamesinoeelast.length ? datadatamesinoee.length : datadatamesinoeelast.length;
        // console.log('data panjangdata ',panjangdata);


        for (let i = 0; i < panjangdata; i++) {


          // console.log(datadatamesinoeelast[i].line);
          // console.log(datadatamesinoeelast[i].machine_id);
          // console.log(datadatamesinoeelast[i].machine_name);
          // console.log(datadatamesinoeelast[i]);

          //  console.log(datadatamesinoeelast[i]);

          

          datakategori = {
            line : datadatamesinoeelast[i] ? datadatamesinoeelast[i].line : datadatamesinoee[i].line,
            machine_id_last : datadatamesinoeelast[i] ? datadatamesinoeelast[i].machine_id : datadatamesinoee[i].machine_id,
            machine_name_last : datadatamesinoeelast[i] ? datadatamesinoeelast[i].machine_name : datadatamesinoee[i].machine_name,
            AR_last : datadatamesinoeelast[i] ? Number(datadatamesinoeelast[i].AR.toFixed(1)) : 0,
            PR_last : datadatamesinoeelast[i] ? Number(datadatamesinoeelast[i].PR.toFixed(1)) : 0,
            QR_last : datadatamesinoeelast[i] ? Number(datadatamesinoeelast[i].QR.toFixed(1)) : 0,  
            OEE_last : datadatamesinoeelast[i] ? Number(datadatamesinoeelast[i].OEE.toFixed(1)) : 0,
            machine_id_present : datadatamesinoee[i] ? datadatamesinoee[i].machine_id : datadatamesinoeelast[i].machine_id,
            machine_name_present : datadatamesinoee[i] ? datadatamesinoee[i].machine_name : datadatamesinoeelast[i].machine_name,
            AR_present : datadatamesinoee[i] ? Number(datadatamesinoee[i].AR.toFixed(1)) : 0,
            PR_present : datadatamesinoee[i] ? Number(datadatamesinoee[i].PR.toFixed(1)) : 0,
            QR_present : datadatamesinoee[i] ? Number(datadatamesinoee[i].QR.toFixed(1)) : 0,
            OEE_present : datadatamesinoee[i] ? Number(datadatamesinoee[i].OEE.toFixed(1)) : 0,
          }

          // console.log(datakategori);

          dataMesinOeeTerendah.push(datakategori);
        }

        // console.log(dataMesinOeeTerendah);
        
        // if(datadatamesinoee.length > 0 && datadatamesinoeelast.length > 0){
          
        //   datakategori = {
        //     line : datadatamesinoeelast[0].line,
        //     machine_id_last : datadatamesinoeelast[0].machine_id,
        //     machine_name_last : datadatamesinoeelast[0].machine_name,
        //     AR_last : Number(datadatamesinoeelast[0].AR.toFixed(1)),
        //     PR_last : Number(datadatamesinoeelast[0].PR.toFixed(1)),
        //     QR_last : Number(datadatamesinoeelast[0].QR.toFixed(1)),  
        //     OEE_last : Number(datadatamesinoeelast[0].OEE.toFixed(1)),
        //     machine_id_present : datadatamesinoee[0].machine_id,
        //     machine_name_present : datadatamesinoee[0].machine_name,
        //     AR_present : Number(datadatamesinoee[0].AR.toFixed(1)),
        //     PR_present : Number(datadatamesinoee[0].PR.toFixed(1)),
        //     QR_present : Number(datadatamesinoee[0].QR.toFixed(1)),
        //     OEE_present : Number(datadatamesinoee[0].OEE.toFixed(1)),
        //   }

        //   dataMesinOeeTerendah.push(datakategori);
        // }



        let sqlGetOEEPresent = `SELECT COALESCE(AVG(OEE1),0) AS OEEPresent FROM v_raw_oees WHERE plant_id='${plant}' 
        AND YEAR(rundate) = ${tahun}  
        AND MONTH(rundate)=${bulan} AND line='${kategori}'`;
        let getdataoeepresent = await request.query(sqlGetOEEPresent);
        let dataoeepresent = getdataoeepresent.recordset[0].OEEPresent;


        dataoeepresent_arr.push(dataoeepresent);


        let sqlGetOEELast= `SELECT COALESCE(AVG(OEE1),0) AS OEELast FROM v_raw_oees WHERE plant_id='${plant}' 
        AND YEAR(rundate) = ${tahun_min_satu}  
        AND MONTH(rundate)=${bulan_min_satu} AND line='${kategori}'`;
        let getdataoeelast = await request.query(sqlGetOEELast);
        let dataoeelast = getdataoeelast.recordset[0].OEELast;
  
  
        dataoeelast_arr.push(dataoeelast);
  
        let sqlGetTargetOee = `SELECT oee_target FROM oee_targettbl ot WHERE oee_year=${tahun} AND plant_id='${plant}' AND areaid = '${kategori}'`;
        let getdataoee = await request.query(sqlGetTargetOee);
        let target = 0;
  
  
        for (let i = 0; i < getdataoee.recordset.length; i++) {
          target = target + getdataoee.recordset[i].oee_target;
        }
  
        if(target > 0 && getdataoee.recordset.length > 1){
  
          target = target /  getdataoee.recordset.length;
  
        }

        target_arr.push(target);

      //console.log(target);

      let getSqlData = `SELECT DAY(rundate) AS number_of_day,line,COALESCE(AVG(OEE1),0) AS OEE
      from v_raw_oees vro WHERE plant_id='${plant}' 
      AND YEAR(rundate) = ${tahun} 
      AND MONTH(rundate)= ${bulan}
      GROUP BY rundate,line
      ORDER by line,rundate`;
      
      // console.log(getSqlData);
      
      let data =  await request.query(getSqlData);
      let dataoeeperiod = data.recordset;

      let hariArr = [];
      for (let i = 0; i < dataoeeperiod.length; i++) {
          let hari = dataoeeperiod[i].number_of_day;
          hariArr.push(hari);
          
      }

      hariArr = _.uniq(hariArr);
      hariArr = hariArr.sort(function(a, b) {
        return a - b;
      });

      datalabel = hariArr;

      let datapOEElant = [];
      for (let j = 0; j < hariArr.length; j++) {
          

          let dataplant = dataoeeperiod.find(e => e.number_of_day==hariArr[j] && e.line==kategori);          
          if(dataplant){
                let oee = Number((dataplant.OEE).toFixed(2));
                datapOEElant.push(oee);
          }else{
            datapOEElant.push(0);
          }

          
          
      }

      let datasets = {
        label: deskripsi,
        fill: false,
        backgroundColor: color,
        borderColor: color,
        pointRadius: 6,
        pointHoverRadius: 3,
        data: datapOEElant
      };
            
      datasets_arr.push(datasets);



    }

    //console.log(datalabel);
    // console.log(datasets_arr);

    // console.log(datalabelNilaiOee);
    // console.log(target_arr);
    // console.log(dataoeelast_arr);
    // console.log(dataoeepresent_arr);
    

    let datachart = {
      labels: datalabel,
      datasets: datasets_arr,
      chartDataNilaiOEE: {
          labels: datalabelNilaiOee,
          datasets: [
            {
              label: "%Increase",
              backgroundColor: "yellow",
              borderColor: "white",
              borderWidth: 2,
              fill: true,
              yAxisID: 'y-axis-1',
              pointRadius: 8,
              type: 'line',
              pointHoverRadius: 15,
              showLine: false, // no line shown
              data: [2.0, 0.0]		
            },
            {
              label: "Target",
              backgroundColor: "red",
              borderColor: "white",
              borderWidth: 2,
              fill: true,
              yAxisID: 'y-axis-2',
              pointRadius: 8,
              pointHoverRadius: 15,
              showLine: false,
              data: target_arr
            },
            {
              label: periodLast,
              fill: false,
              lineTension: 0.1,
              backgroundColor: "grey",
              borderColor: "grey",
              borderWidth:1,
              pointHoverBackgroundColor: "rgba(59, 89, 152, 1)",
              pointHoverBorderColor: "rgba(59, 89, 152, 1)",
              yAxisID: 'y-axis-2',
              data: dataoeelast_arr
            },
            {
              label: periodPresent,
              fill: false,
              lineTension: 0.1,
              backgroundColor: "blue",
              borderColor: "blue",
              borderWidth:1,
              pointHoverBackgroundColor: "rgba(59, 89, 152, 1)",
              pointHoverBorderColor: "rgba(59, 89, 152, 1)",
              yAxisID: 'y-axis-2',
              data: dataoeepresent_arr
            }
          ]
        },
        chartOptionsNilaiOEE: {
          maintainAspectRatio : false,
          responsive : true,
          scales: {
            xAxes: [{
              stacked: false,
            }],
            yAxes: [{
              type: 'linear', // only linear but allow scale type registration. This allows extensions to exist solely for log scale for instance
              display: true,
              ticks: {
                beginAtZero: true,
              },
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
            }],
          },
          title: {
            display: true,
            text: ``
          },
          tooltips: {
            mode: 'index',
            footerFontStyle: 'normal'
          },
          hover: {
            mode: 'index',
            intersect: true
          }
        },
        periodLast:periodLast,
        periodPresent:periodPresent,
        dataMesinOeeTerendah:dataMesinOeeTerendah,
        bulan_present:bulan_present,
        bulan_last:bulan_last
    }

    //  console.log(datachart);

      return res.success({
        result:datachart,
        message: "Submit data successfully"
      });


    } catch (err) {
      return res.error(err);
    }
  },

  
}

function pad(d) {
    return (d < 10) ? '0' + d.toString() : d.toString();
}