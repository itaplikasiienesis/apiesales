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
const soapRequest = require('easy-soap-request');
const Base64 = require('base-64');

module.exports = {
  // GET ALL RESOURCE

  find: async function(req, res) {
    const {
      query: { currentPage, pageSize,m_mesin_id,r_delivery_plant_id,searchText,startdate,enddate}
    } = req;


    await DB.poolConnect;
    try {
      const request = DB.pool.request();
      const { limit, offset } = calculateLimitAndOffset(currentPage, pageSize);
      const whereClause = req.query.filter ? `AND ${req.query.filter}` : "";


      const WhereRangeClause = (startdate && enddate) ? `AND CONVERT(VARCHAR(10),o.order_date,120) BETWEEN '${startdate}' AND '${enddate}'` : "";
    
      const whereMesinClause = m_mesin_id ? `AND mm.m_mesin_id = '${m_mesin_id}'` : "";
      const wherePlantClause = r_delivery_plant_id ? `AND plant.r_delivery_plant_id = '${r_delivery_plant_id}'` : "";
      const whereSearchClause = searchText ? `AND o.order_number LIKE '%${searchText}%' 
      OR o.sku_description LIKE '%${searchText}%' OR o.kode_mesin LIKE '%${searchText}%'  
      OR o.description LIKE '%${searchText}%' OR o.kode_plant LIKE '%${searchText}%' 
      OR mm.nama LIKE '%${searchText}%' OR plant.nama LIKE '%${searchText}%'` : "";

      


      let queryCountTable = `SELECT COUNT(1) AS total_rows FROM oee o
      LEFT JOIN m_mesin mm ON o.kode_mesin = mm.kode 
      LEFT JOIN r_delivery_plant plant ON plant.kode_sales_org = o.kode_plant
      WHERE 1=1 ${whereClause} ${whereMesinClause} ${wherePlantClause} ${whereSearchClause} ${WhereRangeClause}`;


      
      let queryDataTable = `SELECT o.*,mm.m_mesin_id,mm.nama AS nama_mesin,plant.nama AS nama_plant FROM oee o
                            LEFT JOIN m_mesin mm ON o.kode_mesin = mm.kode 
                            LEFT JOIN r_delivery_plant plant ON plant.kode_sales_org = o.kode_plant
                            WHERE 1=1 ${whereClause} ${whereMesinClause} ${wherePlantClause} ${whereSearchClause} ${WhereRangeClause}
                            order by order_date DESC
                            OFFSET ${offset} ROWS
                            FETCH NEXT ${limit== 0 ? 10 : limit} ROWS ONLY`;

                            //console.log(queryDataTable);

      // `SELECT CASE WHEN COALESCE(sum(yield_qty),0) > 0 OR COALESCE(sum(scrap_qty),0) > 0 OR COALESCE(sum(total_production),0) > 0 OR COALESCE(sum(time_processing),0) > 0 THEN 'Sudah DiProses' ELSE 'Belum DiProses' END  FROM oee_detail WHERE oee_id`


      const totalItems = await request.query(queryCountTable);
      const count = totalItems.recordset[0].total_rows || 0;

      request.query(queryDataTable,async (err, result) => {
        if (err) {
          return res.error(err);
        }

        const rows = result.recordset;
        const meta = paginate(currentPage, count, rows, pageSize);

        for (let i = 0; i < rows.length; i++) {
          let oee_id = rows[i].oee_id;
          
          let sqlgetDetail = `SELECT CASE WHEN COALESCE(sum(yield_qty),0) > 0 OR COALESCE(sum(scrap_qty),0) > 0 
          OR COALESCE(sum(total_production),0) > 0 OR COALESCE(sum(time_processing),0) > 0 
          THEN 'Sudah Diproses' ELSE 'Belum Diproses' END AS status FROM oee_detail WHERE oee_id='${oee_id}'`;
          let getdatastatus = await request.query(sqlgetDetail);

          let status = getdatastatus.recordset[0].status;
          rows[i].status_input = status;

          
        }
        /**
         * {
         *    result : data utama,
         *    meta : data tambahan ( optional ),
         *    status : status response ( optional),
         *    message : pesan ( optional )
         * }
         */
        //console.log(rows);
        return res.success({
          result: rows,
          meta,
          message: "Fetch data successfully"
        });
      });
    } catch (err) {
      return res.error(err);
    }
  },
  submit: async function(req, res) {
    const {m_user_id,oee_id,details} = req.body;

    console.log(req.body);

    await DB.poolConnect;
    try {
      const request = DB.pool.request();

      let user = 'SYSTEM';
      if(m_user_id){
        user = m_user_id;
      }


      
      for (let i = 0; i < details.length; i++) {
        
        //let detailsbigloses = details[i].detailsbigloses;
        let oee_detail_id = details[i].oee_detail_id;


        let sqlgetdataOee = `SELECT o.*,mmd.kode AS mesin_id,od.oee_detail_id,od.m_mesin_detail_id,
        CASE WHEN o.kode_plant = '1202' THEN 'CWI' WHEN o.kode_plant = '2101' THEN 'PGD' 
        WHEN o.kode_plant = '1101' THEN 'PGD' WHEN o.kode_plant = '1201' THEN 'CKG' END AS nama_plant,
        LEFT(sku_description,7) AS product_id
        FROM oee o,oee_detail od, m_mesin mm,m_mesin_detail mmd
        WHERE o.oee_id='${oee_id}'
        AND o.kode_mesin = mm.kode
        AND o.oee_id = od.oee_id 
        AND od.m_mesin_detail_id = mmd.m_mesin_detail_id
        AND od.oee_detail_id = '${oee_detail_id}'
        AND mm.m_mesin_id = mmd.m_mesin_id`;

        console.log(sqlgetdataOee);
        let dataOee = await request.query(sqlgetdataOee);
        let oee = dataOee.recordset[0];



        let spk_qty  = Number(details[i].spk_qty);
        let yield_qty  = Number(details[i].yield_qty);
        let scrap_qty  = Number(details[i].scrap_qty);
        let total_production  = Number(details[i].total_production);
        let time_processing  = Number(details[i].time_processing);
        let downtime  = Number(details[i].downtime);
        let planned_time  = Number(details[i].planned_time);


        let cycle_time = 100;
        let machine_id = oee.mesin_id;
        //let plant_id = oee.kode_plant;
        let product_id = oee.product_id;
        let operating_time = time_processing;
        let uom = oee.uom;
        let nama_plant = oee.nama_plant;
        let order_date = moment(oee.order_date,'YYYY-MM-DD').format('YYYY-MM-DD');

        let sqlgetCycleTime = `SELECT * FROM oee_machinecycletbl WHERE machine_id ='${machine_id}' AND (product_id ='${product_id}' OR kode_sap ='${product_id}')`;
        console.log(sqlgetCycleTime);
        let dataCycleTime = await request.query(sqlgetCycleTime);
        let cycleTime = dataCycleTime.recordset;

        if(cycleTime.length > 0){
          cycle_time = cycleTime[0].cycle_time;
        }


        let sqlupdatedetailmesin = `UPDATE oee_detail
        SET spk_qty=${spk_qty}, 
        yield_qty=${yield_qty}, 
        scrap_qty=${scrap_qty}, 
        total_production=${total_production}, 
        time_processing=${time_processing}, 
        planned_time=${planned_time}, 
        downtime=${downtime}
        WHERE oee_detail_id='${oee_detail_id}'`;
        await request.query(sqlupdatedetailmesin);


        let deleteOeeDetail = `DELETE FROM oee_rawdatatbl WHERE oee_detail_id = '${oee_detail_id}'`; 
        await request.query(deleteOeeDetail);

        // Proses insert Raw DATA
        let insertRawOee = `INSERT INTO oee_rawdatatbl
        (machine_id, 
        plant_id, 
        product_id, 
        operating_time, 
        planned_time, 
        cycle_time, 
        tot_pieces, 
        good_pieces, 
        units, 
        rundate, 
        data_status, 
        creaby, 
        creadate, 
        modiby, 
        modidate, 
        oee_id,
        oee_detail_id)
        VALUES('${machine_id}', '${nama_plant}', '${product_id}', ${operating_time},  
        ${planned_time}, ${cycle_time}, ${total_production}, ${yield_qty}, '${uom}','${order_date}',
        '1', '${m_user_id}', getdate(), '${m_user_id}', getdate(), '${oee_id}', 
        '${oee_detail_id}')`;
        console.log(insertRawOee);

        await request.query(insertRawOee);

        

        let sqlgetDetailBigloses = `SELECT odb.*,mb1.nama AS nama_1,
        mb1.explanation AS explanation_1,
        mb2.nama AS nama_2,mb2.explanation AS explanation_2,
        mb3.nama AS nama_3,mb3.explanation AS explanation_3
        FROM oee_detail_bigloses odb 
        LEFT JOIN m_bigloses mb1 ON mb1.kode = odb.kode_bigloses_shift1
        LEFT JOIN m_bigloses mb2 ON mb2.kode = odb.kode_bigloses_shift2 
        LEFT JOIN m_bigloses mb3 ON mb3.kode = odb.kode_bigloses_shift3
        WHERE odb.oee_detail_id = '${oee_detail_id}'`;
        console.log(sqlgetDetailBigloses);
        let dataDetailBigloses = await request.query(sqlgetDetailBigloses);
        
        let detailsbigloses = dataDetailBigloses.recordset

        

        let deletedetail = `DELETE FROM oee_detail_bigloses WHERE oee_detail_id = '${oee_detail_id}'`;
        await request.query(deletedetail);

        for (let j = 0; j < detailsbigloses.length; j++) {

          let kode_bigloses_shift1 = detailsbigloses[j].kode_bigloses_shift1;
          let occurance_shift1 = detailsbigloses[j].occurance_shift1; 
          let min_shift1 = detailsbigloses[j].min_shift1;
          let kode_bigloses_shift2 = detailsbigloses[j].kode_bigloses_shift2;
          let occurance_shift2 = detailsbigloses[j].occurance_shift2;
          let min_shift2 = detailsbigloses[j].min_shift2;
          let kode_bigloses_shift3 = detailsbigloses[j].kode_bigloses_shift3;
          let occurance_shift3 = detailsbigloses[j].occurance_shift3;
          let min_shift3 = detailsbigloses[j].min_shift3;
          let oee_detail_id = detailsbigloses[j].oee_detail_id;
          let note_shift_1 = detailsbigloses[j].note_shift_1;
          let note_shift_2 = detailsbigloses[j].note_shift_2;
          let note_shift_3 = detailsbigloses[j].note_shift_3;
          let oee_detail_bigloses_id = detailsbigloses[j].oee_detail_bigloses_id;


          let catatan1 = note_shift_1 ? `'${note_shift_1}'` : 'NULL';
          let catatan2 = note_shift_2 ? `'${note_shift_2}'` : 'NULL';
          let catatan3 = note_shift_3 ? `'${note_shift_3}'` : 'NULL';
          

          let sqlInsert = `INSERT INTO oee_detail_bigloses
          (oee_detail_bigloses_id,createdby,updatedby,oee_detail_id, kode_bigloses_shift1, occurance_shift1, 
          min_shift1, kode_bigloses_shift2, 
          occurance_shift2, min_shift2, kode_bigloses_shift3, 
          occurance_shift3, min_shift3,note_shift_1,note_shift_2,note_shift_3)
          VALUES('${oee_detail_bigloses_id}','${user}',
          '${user}', 
          '${oee_detail_id}', 
          '${kode_bigloses_shift1}', ${occurance_shift1}, ${min_shift1}, 
          '${kode_bigloses_shift2}', ${occurance_shift2}, ${min_shift2}, 
          '${kode_bigloses_shift3}', ${occurance_shift3}, ${min_shift3},
          ${catatan1},${catatan2},${catatan3})`;


          //console.log(sqlInsert);

          await request.query(sqlInsert);


          // if(min_shift1 > 0 ){
          //   let insertLossOee = `INSERT INTO oee_losstbl
          //   (loss_id, loss_time, notes,rundate, 
          //   machine_id, plant_id, product_id,oee_detail_bigloses_id)
          //   VALUES('${kode_bigloses_shift1}', ${min_shift1}, '${explanation_1}', '${order_date}', '${machine_id}', '${nama_plant}', '${product_id}','${oee_detail_bigloses_id}')`;
          //   await request.query(insertLossOee);
          // }

          // if(min_shift2 > 0 ){
          //   let insertLossOee = `INSERT INTO oee_losstbl
          //   (loss_id, loss_time, notes,rundate, 
          //   machine_id, plant_id, product_id,oee_detail_bigloses_id)
          //   VALUES('${kode_bigloses_shift2}', ${min_shift2}, '${explanation_2}', '${order_date}', '${machine_id}', '${nama_plant}', '${product_id}','${oee_detail_bigloses_id}')`;
          //   await request.query(insertLossOee);
          // }

          
          // if(min_shift3 > 0 ){
          //   let insertLossOee = `INSERT INTO oee_losstbl
          //   (loss_id, loss_time, notes,rundate, 
          //   machine_id, plant_id, product_id,oee_detail_bigloses_id)
          //   VALUES('${kode_bigloses_shift3}', ${min_shift3}, '${explanation_3}', '${order_date}', '${machine_id}', '${nama_plant}', '${product_id}','${oee_detail_bigloses_id}')`;
          //   await request.query(insertLossOee);
          // }


          
        }

        
        
      }

      return res.success({
        message: "Submit data successfully"
      });


    } catch (err) {
      return res.error(err);
    }
  },
  findOne: async function (req, res) {
    await DB.poolConnect;
    try {
      const request = DB.pool.request();

      let queryDataTable = `SELECT o.*,mm.nama AS nama_mesin FROM oee o
      LEFT JOIN m_mesin mm ON o.kode_mesin = mm.kode WHERE oee_id='${req.param(
        "id"
      )}'`;


      request.query(queryDataTable,async (err, result) => {
        if (err) {
          return res.error(err);
        }

        const row = result.recordset[0];
        let oee_id = row.oee_id;

        
        let sqlgetDetail = `SELECT
        od.oee_id,
        od.oee_detail_id,
        od.m_mesin_detail_id, 
        od.spk_qty, 
        od.yield_qty, 
        od.scrap_qty, od.total_production,COALESCE(o.uom,od.uom) AS uom, 
        od.time_processing, od.planned_time, 
        od.downtime,
        mmd.nama AS nama_detail_mesin,
        mmd.kode AS kode_mesin
        FROM oee_detail od,oee o,m_mesin_detail mmd
        WHERE od.oee_id='${oee_id}'
        AND od.oee_id = o.oee_id
        AND od.m_mesin_detail_id = mmd.m_mesin_detail_id  ORDER BY mmd.nama`;


        let datadetails = await request.query(sqlgetDetail);
        let details =  datadetails.recordset;


        row.details = details;
        return res.success({
          result: row,
          message: "Fetch data successfully"
        });
      });
    } catch (err) {
      return res.error(err);
    }
  },


  reset: async function (req, res) {
    await DB.poolConnect;
    try {
      const request = DB.pool.request();

      let m_user_id = req.query.m_user_id;
      let oee_id = req.param("id");
      let queryDataTable = `SELECT o.*,mm.nama AS nama_mesin FROM oee o
      LEFT JOIN m_mesin mm ON o.kode_mesin = mm.kode WHERE oee_id='${req.param(
        "id"
      )}'`;

      //console.log(queryDataTable);


      request.query(queryDataTable,async (err, result) => {
        if (err) {
          return res.error(err);
        }

        const row = result.recordset[0];
        const kode_mesin = row.kode_mesin;
        const nomorOrder = row.order_number;


        // Proses Reset SOAP.

      let usernamesoap = sails.config.globals.usernamesoap;
      let passwordsoap = sails.config.globals.passwordsoap;
      const tok = `${usernamesoap}:${passwordsoap}`;
      const hash = Base64.encode(tok);
      const Basic = 'Basic ' + hash;

      let headers = {
        'Authorization':Basic,
        'user-agent': 'EIS',
        'Content-Type': 'text/xml;charset=UTF-8',
        'soapAction': 'urn:sap-com:document:sap:rfc:functions:zws_eis_noee:ZFM_WS_NOEERequest',
      };


      let xml = fs.readFileSync('soap/ZWS_EIS_NOOEE.xml', 'utf-8'); // saya duplicate file 'ZFM_WS_CMO.xml' ya, dan pake yg baru saya buat itu sebagai template
      let hasil = racikXML(xml, nomorOrder);

      let sqlgetstatusIntegasi = `SELECT TOP 1 * FROM integration_url ORDER BY created DESC`;
      let datastatusIntegasi = await request.query(sqlgetstatusIntegasi);
      let statusIntegasi = datastatusIntegasi.recordset.length > 0 ? datastatusIntegasi.recordset[0].status : 'DEV';


      let url = ``;
      if(statusIntegasi=='DEV'){

        url = 'http://sapprdene.enesis.com:8310/sap/bc/srt/rfc/sap/zfm_ws_noee/300/zws_data_noee/zbn_data_noee'; // development
        
          
      }else{
  
        url = 'http://sapprdene.enesis.com:8310/sap/bc/srt/rfc/sap/zfm_ws_noee/300/zws_data_noee/zbn_data_noee'; // production
  
      }

      let { response } = await soapRequest({ url: url, headers: headers,xml:hasil, timeout: 1000000 }); // Optional timeout parameter(milliseconds)
      let {body, statusCode } = response;

      // console.log('statusCode ',statusCode);
      if(statusCode==200){
        let parsedXML = await xml2js.parseStringPromise(body);
        let item = parsedXML['soap-env:Envelope']['soap-env:Body'][0]['n0:ZFM_WS_NOEEResponse'][0].ITAB[0].item;
        // console.log('item ',item);
        let dataItem = item.filter(e=> e.AUFNR[0]!=='');

        let DWERK = dataItem[0].DWERK[0];
        let MATNR = dataItem[0].MATNR[0];
        let MAKTX = dataItem[0].MAKTX[0];
        let PSMNG = Number(dataItem[0].PSMNG[0]);
        let LMNGA = Number(dataItem[0].LMNGA[0]);
        let XMNGA = Number(dataItem[0].XMNGA[0]);
        let GMEIN = dataItem[0].GMEIN[0];
        let GSTRP = dataItem[0].GSTRP[0];
        let ISM01 = Number(dataItem[0].ISM01[0]);
        let ILE01 = dataItem[0].ILE01[0];
        let ARBPL = dataItem[0].ARBPL[0];
        let KTEXT = dataItem[0].KTEXT[0];


        let sku_description = MATNR+'/'+MAKTX.replace('\'','\'\'');
        let total_production = LMNGA + XMNGA;

        let sqlUpdateDataOee = `UPDATE oee
        SET updated=getdate(), updatedby='${m_user_id}', 
        order_date='${GSTRP}', 
        sku_description='${sku_description}', spk_qty=${PSMNG}, yield_qty=${LMNGA}, scrap_qty=${XMNGA}, 
        total_production=${total_production}, time_production=${ISM01}, uom='${GMEIN}', kode_mesin='${ARBPL}', 
        time_unit='${ILE01}', kode_plant='${DWERK}', description='${KTEXT}'
        WHERE oee_id='${oee_id}'`;

        await request.query(sqlUpdateDataOee);

      }
        

        let sqlgetDetailCek = `SELECT
        od.oee_id,
        od.oee_detail_id,
        od.m_mesin_detail_id, 
        od.spk_qty, 
        od.yield_qty, 
        od.scrap_qty, od.total_production,COALESCE(o.uom,od.uom) AS uom, 
        od.time_processing, od.planned_time, 
        od.downtime,
        mmd.nama AS nama_detail_mesin,
        mmd.kode AS kode_mesin
        FROM oee_detail od,oee o,m_mesin_detail mmd
        WHERE od.oee_id='${oee_id}'
        AND od.oee_id = o.oee_id
        AND od.m_mesin_detail_id = mmd.m_mesin_detail_id  ORDER BY mmd.nama`;


        let datadetailscek = await request.query(sqlgetDetailCek);
        let datacekdetails =  datadetailscek.recordset;

        for (let i = 0; i < datacekdetails.length; i++) {
          
          
          let oee_detail_id = datacekdetails[i].oee_detail_id;
      
          let deletedetail = `DELETE FROM oee_detail_bigloses WHERE oee_detail_id = '${oee_detail_id}'`;
          await request.query(deletedetail);

          let deleteOeeDetail = `DELETE FROM oee_rawdatatbl WHERE oee_detail_id = '${oee_detail_id}'`; 
          await request.query(deleteOeeDetail);


      
          
        }

        let sqlDeleteDetail = `DELETE FROM oee_detail
        WHERE oee_id='${oee_id}'`;
        await request.query(sqlDeleteDetail);

      
        let sqlgetKodemesinDetail = `SELECT mmd.* from m_mesin mm,m_mesin_detail mmd 
        where mm.kode = '${kode_mesin}'
        AND mm.m_mesin_id = mmd.m_mesin_id`;
        let datakodemesindetails = await request.query(sqlgetKodemesinDetail);
        let kodemesindetails =  datakodemesindetails.recordset;

        for (let i = 0; i < kodemesindetails.length; i++) {
          
          let m_mesin_detail_id = kodemesindetails[i].m_mesin_detail_id;

          let sqlInsertMesinDetail = `INSERT INTO oee_detail
          (oee_detail_id, isactive, created, createdby, updated, updatedby, oee_id, 
          m_mesin_detail_id, 
          spk_qty, yield_qty, scrap_qty, 
          total_production, uom, time_processing, planned_time, downtime)
          VALUES(newid(), 'Y', getdate(), '${m_user_id}', getdate(), '${m_user_id}', 
          '${oee_id}', '${m_mesin_detail_id}', 0, 0, 0, 0, 'MIN', 0, 0, 0)`;


          await request.query(sqlInsertMesinDetail);
          
        }


        let sqlgetDetail = `SELECT
        od.oee_id,
        od.oee_detail_id,
        od.m_mesin_detail_id, 
        od.spk_qty, 
        od.yield_qty, 
        od.scrap_qty, od.total_production,COALESCE(o.uom,od.uom) AS uom, 
        od.time_processing, od.planned_time, 
        od.downtime,
        mmd.nama AS nama_detail_mesin,
        mmd.kode AS kode_mesin
        FROM oee_detail od,oee o,m_mesin_detail mmd
        WHERE od.oee_id='${oee_id}'
        AND od.oee_id = o.oee_id
        AND od.m_mesin_detail_id = mmd.m_mesin_detail_id  ORDER BY mmd.nama`;


        let datadetails = await request.query(sqlgetDetail);
        let details =  datadetails.recordset;


        let queryDataTableUpdate = `SELECT o.*,mm.nama AS nama_mesin FROM oee o
        LEFT JOIN m_mesin mm ON o.kode_mesin = mm.kode WHERE oee_id='${req.param(
          "id"
        )}'`;
        let dataupdated = await request.query(queryDataTableUpdate);
        let rowupdated = dataupdated.recordset[0];
      
        rowupdated.details = details;
        return res.success({
          result: rowupdated,
          message: "Fetch data successfully"
        });
      });
    } catch (err) {
      return res.error(err);
    }
  },


  findAllBigLoses: async function(req, res) {
    const {
      query: {currentPage,pageSize,oee_detail_id}
    } = req;
    await DB.poolConnect;
    try {
      const request = DB.pool.request();
      const { limit, offset } = calculateLimitAndOffset(currentPage, pageSize);
      const whereClause = req.query.filter ? `AND ${req.query.filter}` : "";


    
      let queryCountTable = `SELECT COUNT(1) AS total_rows from oee_detail_bigloses 
      WHERE 1=1 AND oee_detail_id = '${oee_detail_id}' ${whereClause}`;

      
      let queryDataTable = `SELECT 
      mb1.nama AS shift1,
      mb1.explanation AS explanation1,
      mb1.kategori AS kategori1,
      odb.occurance_shift1,
      odb.min_shift1,
      mb2.nama AS shift2,
      mb2.explanation AS explanation2,
      mb2.kategori AS kategori2,
      odb.occurance_shift2,
      odb.min_shift2,
      mb3.nama AS shift3,
      mb3.explanation AS explanation3,
      mb3.kategori AS kategori3,
      odb.occurance_shift3,
      odb.min_shift3,
      mm.nama AS nama_mesin,
      odb.oee_detail_id  
      from oee_detail_bigloses odb,oee_detail od,
      m_mesin_detail mm,m_bigloses mb1,m_bigloses mb2,m_bigloses mb3
      WHERE 1=1 
      AND odb.oee_detail_id = od.oee_detail_id
      AND mb1.kode = odb.kode_bigloses_shift1
      AND mb2.kode = odb.kode_bigloses_shift2
      AND mb3.kode = odb.kode_bigloses_shift3
      AND mm.m_mesin_detail_id = od.m_mesin_detail_id
      AND odb.oee_detail_id = '${oee_detail_id}' ${whereClause} 
      order by odb.createdby DESC
      OFFSET ${offset} ROWS
      FETCH NEXT ${limit} ROWS ONLY`;


      const totalItems = await request.query(queryCountTable);
      const count = totalItems.recordset[0].total_rows || 0;

      request.query(queryDataTable, (err, result) => {
        if (err) {
          return res.error(err);
        }

        const rows = result.recordset;
        const meta = paginate(currentPage, count, rows, pageSize);
        /**
         * {
         *    result : data utama,
         *    meta : data tambahan ( optional ),
         *    status : status response ( optional),
         *    message : pesan ( optional )
         * }
         */
        return res.success({
          result: rows,
          meta,
          message: "Fetch data successfully"
        });
      });
    } catch (err) {
      return res.error(err);
    }
  },


  findbiglosesbyid: async function(req, res) {
    const {
      query: {m_user_id}
    } = req;
    await DB.poolConnect;
    try {
      const request = DB.pool.request();

      
      let queryDataTable = `SELECT
      mb1.kode AS kode1, 
      mb1.nama AS shift1,
      mb1.explanation AS explanation1,
      mb1.kategori AS kategori1,
      odb.occurance_shift1,
      odb.min_shift1,
      mb2.kode AS kode2, 
      mb2.nama AS shift2,
      mb2.explanation AS explanation2,
      mb2.kategori AS kategori2,
      odb.occurance_shift2,
      odb.min_shift2,
      mb3.kode AS kode3, 
      mb3.nama AS shift3,
      mb3.explanation AS explanation3,
      mb3.kategori AS kategori3,
      odb.occurance_shift3,
      odb.min_shift3,
      mm.nama AS nama_mesin,
      odb.oee_detail_id,
      odb.oee_detail_bigloses_id,
      odb.note_shift_1,
      odb.note_shift_2,
      odb.note_shift_3
      from oee_detail_bigloses odb,oee_detail od,
      m_mesin_detail mm,m_bigloses mb1,m_bigloses mb2,m_bigloses mb3
      WHERE 1=1 
      AND odb.oee_detail_id = od.oee_detail_id
      AND mb1.kode = odb.kode_bigloses_shift1
      AND mb2.kode = odb.kode_bigloses_shift2
      AND mb3.kode = odb.kode_bigloses_shift3
      AND mm.m_mesin_detail_id = od.m_mesin_detail_id
      AND odb.oee_detail_id = '${req.param(
        "id"
      )}'`;

      console.log(queryDataTable);


      request.query(queryDataTable, (err, result) => {
        if (err) {
          return res.error(err);
        }

        const rows = result.recordset;
        /**
         * {
         *    result : data utama,
         *    meta : data tambahan ( optional ),
         *    status : status response ( optional),
         *    message : pesan ( optional )
         * }
         */
        return res.success({
          result: rows,
          message: "Fetch data successfully"
        });
      });
    } catch (err) {
      return res.error(err);
    }
  },
  upsert: async function(req, res) {
    const {
      m_user_id,kode1,occurance_shift1,
      min_shift1,kode2,occurance_shift2,
      min_shift2,kode3,occurance_shift3,
      min_shift3,oee_detail_id,
      oee_detail_bigloses_id,note_shift_1,note_shift_2,note_shift_3
    } = req.body;
    await DB.poolConnect;
    try {
      const request = DB.pool.request();

      let user = 'SYSTEM';
      if(m_user_id){
        user = m_user_id;
      }


      let queryDataTable = `DELETE FROM oee_detail_bigloses WHERE oee_detail_bigloses_id = '${oee_detail_bigloses_id}'`;
      await request.query(queryDataTable);

      let kode_bigloses_shift1 = kode1;
      let kode_bigloses_shift2 = kode2;
      let kode_bigloses_shift3 = kode3;

      let catatan1 = note_shift_1 ? `'${note_shift_1}'` : 'NULL';
      let catatan2 = note_shift_2 ? `'${note_shift_2}'` : 'NULL';
      let catatan3 = note_shift_3 ? `'${note_shift_3}'` : 'NULL';
      

      let sqlInsert = `INSERT INTO oee_detail_bigloses
      (oee_detail_bigloses_id,createdby,updatedby,oee_detail_id, kode_bigloses_shift1, 
      occurance_shift1, min_shift1, kode_bigloses_shift2, 
      occurance_shift2, min_shift2, kode_bigloses_shift3, 
      occurance_shift3, min_shift3,note_shift_1,note_shift_2,note_shift_3)
      VALUES(
      '${oee_detail_bigloses_id}',
      '${user}',
      '${user}', 
      '${oee_detail_id}', 
      '${kode_bigloses_shift1}', ${occurance_shift1}, ${min_shift1}, 
      '${kode_bigloses_shift2}', ${occurance_shift2}, ${min_shift2}, 
      '${kode_bigloses_shift3}', ${occurance_shift3}, ${min_shift3},
      ${catatan1},${catatan2},${catatan3})`;

      await request.query(sqlInsert);



      


      let sqlgetexplanation1 = `SELECT * FROM m_bigloses mb where kode = '${kode_bigloses_shift1}'`;
      let dataexplanation1 = await request.query(sqlgetexplanation1);
      let explanation_1 = dataexplanation1.recordset[0].explanation;

      console.log('explanation_1 ',explanation_1);

      
      let sqlgetexplanation2 = `SELECT * FROM m_bigloses mb where kode = '${kode_bigloses_shift2}'`;
      let dataexplanation2 = await request.query(sqlgetexplanation2);
      let explanation_2 = dataexplanation2.recordset[0].explanation;

      console.log('explanation_2 ',explanation_2);


      let sqlgetexplanation3 = `SELECT * FROM m_bigloses mb where kode = '${kode_bigloses_shift3}'`;
      let dataexplanation3 = await request.query(sqlgetexplanation3);
      let explanation_3 = dataexplanation3.recordset[0].explanation;

      console.log('explanation_3 ',explanation_3);

      let sqlgetheaderdata = `  SELECT o.order_date,mmd.kode AS machine_id,
      CASE WHEN o.kode_plant = '1202' THEN 'CWI' WHEN o.kode_plant = '2101' THEN 'PGD'
        WHEN o.kode_plant = '1101' THEN 'PGD' WHEN o.kode_plant = '1201' THEN 'CKG' END AS nama_plant,
        LEFT(sku_description,7) AS product_id
      FROM oee_detail_bigloses odb ,oee_detail od,oee o,m_mesin_detail mmd 
      where oee_detail_bigloses_id = '${oee_detail_bigloses_id}'
      AND mmd.m_mesin_detail_id = od.m_mesin_detail_id 
      AND od.oee_detail_id = odb.oee_detail_id
      AND o.oee_id = od.oee_id`;

      

      let dataheader = await request.query(sqlgetheaderdata);
      let header = dataheader.recordset[0];
      console.log(header);
      let order_date = moment(header.order_date,'YYYY-MM-DD').format('YYYY-MM-DD');
      let nama_plant = header.nama_plant;
      let machine_id = header.machine_id;
      let product_id = header.product_id;


      if(min_shift1 > 0 ){
        let insertLossOee = `INSERT INTO oee_losstbl
        (loss_id, loss_time, notes,rundate, 
        machine_id, plant_id, product_id,oee_detail_bigloses_id,notes_detail,shift_number)
        VALUES('${kode_bigloses_shift1}', ${min_shift1}, '${explanation_1}', '${order_date}', '${machine_id}', '${nama_plant}', 
        '${product_id}','${oee_detail_bigloses_id}',${catatan1},1)`;
        
        console.log(insertLossOee);
        await request.query(insertLossOee);
      }

      if(min_shift2 > 0 ){
        let insertLossOee = `INSERT INTO oee_losstbl
        (loss_id, loss_time, notes,rundate, 
        machine_id, plant_id, product_id,oee_detail_bigloses_id,notes_detail,shift_number)
        VALUES('${kode_bigloses_shift2}', ${min_shift2}, '${explanation_2}', '${order_date}', '${machine_id}', '${nama_plant}', 
        '${product_id}','${oee_detail_bigloses_id}',${catatan2},2)`;
        await request.query(insertLossOee);
      }

      
      if(min_shift3 > 0 ){
        let insertLossOee = `INSERT INTO oee_losstbl
        (loss_id, loss_time, notes,rundate, 
        machine_id, plant_id, product_id,oee_detail_bigloses_id,notes_detail,shift_number)
        VALUES('${kode_bigloses_shift3}', ${min_shift3}, '${explanation_3}', '${order_date}', '${machine_id}', '${nama_plant}', 
        '${product_id}','${oee_detail_bigloses_id}',${catatan3},3)`;
        await request.query(insertLossOee);
      }


          
      return res.success({
        message: "Create data successfully"
      });

    } catch (err) {
      return res.error(err);
    }
  },
  delete: async function(req, res) {
    const {
      oee_detail_bigloses_id
    } = req.body;
    await DB.poolConnect;
    try {
      const request = DB.pool.request();

      
      let queryDataTable = `DELETE FROM oee_detail_bigloses WHERE oee_detail_bigloses_id = '${oee_detail_bigloses_id}'`;

      request.query(queryDataTable, async (err) => {
        if (err) {
          return res.error(err);
        }

        let queryDataTableLossTable = `DELETE FROM oee_losstbl WHERE oee_detail_bigloses_id = '${oee_detail_bigloses_id}'`;
        await request.query(queryDataTableLossTable);

        return res.success({
          message: "Delete data successfully"
        });
      });
    } catch (err) {
      return res.error(err);
    }
  },
}

function pad(d) {
  var str = "" + d
  var pad = "00000"
  var ans = pad.substring(0, pad.length - str.length) + str
  return ans;
}



function racikXML(xmlTemplate, nomorOrder) {
  return xmlTemplate.replace('?', nomorOrder)
}