/* eslint-disable no-console */
/* eslint-disable no-undef */
/**
 * SampeCrudController
 *
 * @description :: Server-side actions for handling incoming requests.
 * @help        :: See https://sailsjs.com/docs/concepts/actions
 */
const { calculateLimitAndOffset, paginate } = require("paginate-info");
const Base64 = require("base-64");
const soapRequest = require("easy-soap-request");
const fs = require("fs");
const xml2js = require("xml2js");
const uuid = require("uuid/v4");
const SendEmail = require("../../services/SendEmail");
const path = require("path");
const moment = require("moment");
const glob = require("glob");
const json2xls = require("json2xls");
const axios = require("axios");
const numeral = require("numeral");
const puppeteer = require("puppeteer");
const handlebars = require("handlebars");
const { words } = require("lodash");
const { format } = require("path");
const _ = require("lodash");
const { request } = require("http");
var shell = require("shelljs");
const templatePath = () =>
  path.resolve(sails.config.appPath, "assets", "templatefkr");
const direktoricetak = () =>
  path.resolve(sails.config.appPath, "assets", "report", "fkr");
const dokumentPath = (param2, param3) =>
  path.resolve(sails.config.appPath, "repo", param2, param3);
const ClientSFTP = require("ssh2-sftp-client");
const DB = require("../../services/DB");
const sftp = new ClientSFTP();
const ftpconfig = {
  host: "192.168.1.148",
  port: 22,
  user: "sapftp",
  password: "sapftp@2020",
};
module.exports = {
  // GET ALL RESOURCE
  find: async function (req, res) {
    const {
      query: {
        currentPage,
        pageSize,
        m_user_id,
        eksekusi,
        periode,
        jenis,
        status,
        r_distribution_channel_id,
        m_pajak_v_id,
        region_id,
        searchText,
      },
    } = req;
    console.log(req.query);

    await DB.poolConnect;
    try {
      const request = DB.pool.request();
      const { limit, offset } = calculateLimitAndOffset(currentPage, pageSize);
      const whereClause = req.query.filter ? `AND ${req.query.filter}` : "";

      let sqlGetRoleRoleAmount = `SELECT murv.*,fraa.amount FROM m_user_role_v murv 
      LEFT JOIN fkr_role_amount_approve fraa ON(fraa.m_role_id = murv.m_role_id)
      WHERE m_user_id='${m_user_id}'`;
      console.log("getroleee  ",sqlGetRoleRoleAmount);

      let dataroleAmount = await request.query(sqlGetRoleRoleAmount);
      let channel_role =
        dataroleAmount.recordset.length > 0
          ? dataroleAmount.recordset[0].r_distribution_channel_id
          : undefined;
      let amount =
        dataroleAmount.recordset.length > 0
          ? dataroleAmount.recordset[0].amount
          : 0;

      let sqlGetRole = `SELECT * FROM m_user_role_v_new WHERE m_user_id='${m_user_id}'`;
      console.log(sqlGetRole);
      let datarole = await request.query(sqlGetRole);
      let roleAcess = datarole.recordset;
      let rolename = datarole.recordset[0].nama;

      let objectRoleAccessId = null;
      let roleAccessId = null;

      console.log(objectRoleAccessId,">>>>>>>>>>>>>>>>")

      if (checkRole(roleAcess, ["SALESHO1"])) {
        rolename = "SALESHO1";
        objectRoleAccessId = roleAcess.find((e) => e.nama == "SALESHO1");
      } else if (checkRole(roleAcess, ["SALESHO2"])) {
        rolename = "SALESHO2";
        objectRoleAccessId = roleAcess.find((e) => e.nama == "SALESHO2");
        amount = 20000000;
      } else if (checkRole(roleAcess, ["SALESHO3"])) {
        rolename = "SALESHO3";
        objectRoleAccessId = roleAcess.find((e) => e.nama == "SALESHO3");
        amount = 500000000;
      } else if (checkRole(roleAcess, ["ASDH"])) {
        rolename = "ASDH";
        objectRoleAccessId = roleAcess.find((e) => e.nama == "ASDH");
      } else if (checkRole(roleAcess, ["RSDH"])) {
        rolename = "RSDH";
        objectRoleAccessId = roleAcess.find((e) => e.nama == "RSDH");
      } else if (checkRole(roleAcess, ["LOGISTIK"])) {
        rolename = "LOGISTIK";
        objectRoleAccessId = roleAcess.find((e) => e.nama == "LOGISTIK");
      } else if (checkRole(roleAcess, ["FKR LOGISTIK"])) {
        rolename = "FKR LOGISTIK";
        objectRoleAccessId = roleAcess.find((e) => e.nama == "FKR LOGISTIK");
      } else if (checkRole(roleAcess, ["ACCOUNTING"])) {
        rolename = "ACCOUNTING";
        objectRoleAccessId = roleAcess.find((e) => e.nama == "ACCOUNTING");
      }

      if (objectRoleAccessId) {
        roleAccessId = objectRoleAccessId.m_role_id;
      }

      // console.log('roleAccessId ',roleAccessId);
      // console.log(rolename);

      // console.log(sqlGetRole);
      // console.log('r_distribution_channel_id ',r_distribution_channel_id);
      // console.log('m_role_id ',m_role_id);
      // console.log('rolename ',rolename);
      // console.log('amount ',amount);

      let filterchannel = ``;
      let filterbyroles = ``;
      let filterbyamount = ``;
      let filtermpajak = ``;

      if (m_pajak_v_id) {
        filtermpajak = `AND m_pajak_id = '${m_pajak_v_id}' `;
      }

      if (rolename == `DISTRIBUTOR`) {
        let dt = await request.query(`SELECT b.* FROM m_user a
        inner join m_pajak b on a.r_organisasi_id = b.r_organisasi_id
        WHERE a.m_user_id = '${m_user_id}'`);

        // console.log(dt);
        // console.log(`SELECT b.* FROM m_user a
        // inner join m_pajak b on a.r_organisasi_id = b.r_organisasi_id
        // WHERE a.m_user_id = '${m_user_id}'`);

        let m_pajak_id =
          dt.recordset.length > 0 ? dt.recordset[0].m_pajak_id : null;

        if (m_pajak_id) {
          filtermpajak = `AND m_pajak_id = '${dt.recordset[0].m_pajak_id}' `;
        }
      }

      // tambahan filter disin
      let filterperiod = "";
      if (req.query.periode) {
        filterperiod = ` AND convert(varchar(7),created,120) = '${req.query.periode}'`;
      }
      // ini end periodnya
      let filterperiodend = "";
      if (req.query.periode) {
        filterperiodend = ` AND convert(varchar(7),created,120) = '${req.query.periode}'`;
      }

      let filterjenisbetween = ``;
      if (filterperiod && filterperiodend) {
        filterjenisbetween = `AND CONVERT(VARCHAR(7),created,120) BETWEEN '${req.query.periode}' AND '${req.query.periode}'`;
      }

      let filterjenisfkr = "";
      if (req.query.jenis) {
        filterjenisfkr = ` AND kode_eksekusi = '${req.query.jenis}'`;
      }

      let filterjeniseksekusi = "";
      if (req.query.jenis_eksekusi) {
        filterjeniseksekusi = ` AND eksekusi = '${req.query.jenis_eksekusi}'`;
      }

      let filterkodestatus = "";
      if (req.query.kode_status) {
        filterkodestatus = ` AND kode_status = '${req.query.kode_status}'`;
      }

      // console.log(filterperiod);
      // console.log(filterperiodend);
      // sampai sini
      let org = `SELECT distinct mdpv.r_organisasi_id FROM m_distributor_profile_v mdpv 
      inner join m_user b on b.username = mdpv.kode_sold_to 
      WHERE b.m_user_id = '${m_user_id}'`;

      //console.log(org);
      let orgs = await request.query(org);

      if (orgs.recordset.length === 0) {
        let org = `SELECT distinct mdpv.r_organisasi_id FROM m_distributor_profile_v mdpv 
        inner join m_user b on b.username = mdpv.kode_ship_to 
        WHERE b.m_user_id = '${m_user_id}'`;

        orgs = await request.query(org);
      }

      let organization = orgs.recordset.map(function (item) {
        return item["r_organisasi_id"];
      });

      console.log(organization);

      let valueIN = "";
      let listOrg = "";
      let listRegion = "";
      for (const datas of organization) {
        valueIN += ",'" + datas + "'";
      }

      if (region_id) {
        listRegion = `AND kode_region = '${region_id}'`;
      }

      valueIN = valueIN.substring(1);

      console.log(rolename);

      if (rolename == "ASDH") {
        filterbyroles = `AND kode_status IN ('DRAFT','RJC','APA','APR','APL','APF','APS3'
        ,'APS2','APS1','WT1','WT2','WT3','WT4','WT5','WT6','WT7','WT8','WT9','WT10','WT11','WT12','WT0')`;
        listOrg =
          organization.length > 0 && req.query.filter === undefined
            ? `AND r_organisasi_id IN (${valueIN})`
            : "";
      } else if (rolename == "RSDH") {
        filterbyroles = `AND kode_status IN ('RJC','APA','APR','APL','APF','APS3','APS2','APS1','WT1','WT2'
        ,'WT3','WT4','WT5','WT6','WT7','WT8','WT9','PS1','PS2','PS3','WT10','WT11','WT12','WT0')`;
        listOrg =
          organization.length > 0 && req.query.filter === undefined
            ? `AND r_organisasi_id IN (${valueIN})`
            : "";
      } else if (rolename == "LOGISTIK" || rolename == "FKR LOGISTIK") {
        filterbyroles = `AND (kode_status IN ('APL','APF','WT0','APS3','APS2','APS1','WT1','WT2','WT3','WT4','WT5','WT6','WT7','WT8','WT9','WT10','WT11','WT12') or status in ('Success Approve','BAP Belum Diterima Logistik','Menunggu BAP dari Logistik')) `;
      } else if (rolename == "ACCOUNTING") {
        filterbyroles = `AND kode_status IN ('APL','APF','APS3','APS2','APS1','WT1','WT2','WT3','WT4','WT5','WT6','WT7','WT8','WT9','PS1','PS2','PS3','WT10','WT11','WT12')`;
      } else if (rolename == "SALESHO1") {
        filterbyroles = `AND kode_status IN ('APL','APF','WT0','APS3','APS2','WT1','WT2','WT3','WT4','WT5','WT6','WT7','WT8','WT9','PS1','PS2','PS3','WT10','WT11','WT12')`;
        filterbyamount = `AND amount >= ${amount}`;
      } else if (rolename == "SALESHO2") {
        filterbyroles = `AND kode_status IN ('APL','APF','APR','WT0','APS3','APS2','APS1','WT1','WT2','WT3','WT4','WT5','WT6','WT7','WT8','WT9','PS1','PS2','PS3','WT10','WT11','WT12')`;
        filterbyamount = `AND amount >= ${amount}`;
      } else if (rolename == "SALESHO3") {
        // console.log(rolename,channel_role);
        if (channel_role == "AD89DBFA-200C-4C2C-9D56-F507771BED9E") {
          filterchannel = `AND r_distribution_channel_id in ('${channel_role}','CC46832D-0CF1-4AE2-A3A3-B9B9D0B81800','F7A81901-FFB9-41F6-9AB4-AF5FA0029B49')`;
        } else {
          filterchannel = `AND r_distribution_channel_id in ('${channel_role}')`;
        }
        filterbyroles = `AND kode_status IN ('RJC','APL','APF','WT0','APS3','APS2','APS1','APR','WT1','WT2','WT3','WT4','WT5','WT6','WT7','WT8','WT9','PS1','PS2','PS3','WT10')`;
      } else if (rolename == "DISTRIBUTOR") {
        filterbyroles = `AND kode_status IN ('WAITINGSO','RJC','DRAFT','APA','WT0','APR','APL','APF','APS3','APS2','APS1','WT1','WT2','WT3','WT4','WT5','WT6','WT7','WT8','WT9','PS1','PS2','PS3','WT10','WT11','WT12')`;
        listOrg =
          organization.length > 0 && req.query.filter === undefined
            ? `AND r_organisasi_id IN (${valueIN})`
            : "";
      } else if (rolename == "SALESGTREGIONKLAIM") {
        // filterbyroles = `AND kode_status IN ('DRAFT','APA','APR','APL','APF','APS3','APS2','APS1','WT1','WT2','WT3','WT4','WT5','WT6','WT7','WT8','WT9','WT10')`;
      } else if (rolename == "SALESMTREGIONKLAIM") {
        // filterbyroles = `AND kode_status IN ('DRAFT','APA','APR','APL','APF','APS3','APS2','APS1','WT1','WT2','WT3')`;
        // filterbyroles = `AND kode_status IN ('DRAFT','APA','APR','APL','APF','APS3','APS2','APS1','WT1','WT2','WT3','WT4','WT5','WT6','WT7','WT8','WT9','WT10')`;
      } else if (rolename == "SALESMTREGIONKLAIM") {
        // filterbyroles = `AND kode_status IN ('DRAFT','APA','APR','APL','APF','APS3','APS2','APS1','WT1','WT2','WT3','WT4','WT5','WT6','WT7','WT8','WT9','WT10')`;
      } else if (rolename == "SALESFINANCE") {
        filterbyroles = `AND kode_status IN ('WT8','WT9','PS1','PS2','PS3','WT10','WT11','WT12','PS2')`;
      }

      if (r_distribution_channel_id) {
        filterchannel = `AND r_distribution_channel_id = '${r_distribution_channel_id}'`;
      }

      if (req.query.status) {
        if (req.query.status == "OP") {
          filterbyroles = ` AND status = 'On Progress' `;
        } else if (req.query.status == "MBK") {
          filterbyroles = ` AND (status = 'BAP Belum Diterima Logistik')`;
        } else if (req.query.status == "SA") {
          filterbyroles = ` AND status in ('Success Approve','BAP Diterima Logistik','Menunggu BAP dari Logistik')`;
        } else {
          filterbyroles = ` AND kode_status = '${req.query.status}' `;
        }
      }


      let filtereksekusi = ``;
      if (eksekusi) {
        filtereksekusi = `AND kode_eksekusi = '${eksekusi}'`;
      }

      let filterlike = ``;
      if (searchText) {
        filterlike = ` AND (nomor_so like '%${searchText}%' or nomor_fkr like '%${searchText}%' or eksekusi like '%${searchText}%' or nomor_gi like '%${searchText}%' or nomor_cn like '%${searchText}%')`;
      }


      if (checkRole(roleAcess, ["SYSTEM"])) {
        
        filterchannel = '';
        listOrg = '';
        filterbyroles = '';
        filterbyamount = '';
        filterperiod = '';
        filterjenisfkr = '';
        filterlike = '';
        listRegion = '';
        filtermpajak = '';
        filterkodestatus = '';
        filterjeniseksekusi = '';

      }


      let queryCountTable = `SELECT COUNT(1) AS total_rows
                              FROM fkr_v WHERE 1=1 ${whereClause} ${listOrg} ${filterchannel} ${filterbyroles} ${filterbyamount}
                              ${filterperiod} ${filterjenisfkr} ${filtermpajak} ${filterlike} ${listRegion} ${filterjeniseksekusi} ${filterkodestatus} `;

      let queryDataTable = `SELECT *
                            FROM fkr_v WHERE 1=1
                            ${whereClause} ${listOrg} ${filterchannel} ${filterbyroles} ${filterbyamount}
                            ${filterperiod} ${filterjenisfkr} ${filtermpajak} ${filterlike} ${listRegion}
                            ${filterjeniseksekusi} ${filterkodestatus}
                            ORDER BY created DESC
                            OFFSET ${offset} ROWS
                            FETCH NEXT ${limit} ROWS ONLY`;
      console.log("querynya ", queryDataTable);

      const totalItems = await request.query(queryCountTable);
      const count = totalItems.recordset[0].total_rows || 0;

      request.query(queryDataTable, async (err, result) => {
        if (err) {
          return res.error(err);
        }

        const rows = result.recordset;
        const meta = paginate(currentPage, count, rows, pageSize);

        for (let i = 0; i < rows.length; i++) {
          let fkr_id = rows[i].fkr_id;
          let queryDetail = `SELECT a.fkr_detail_id, 
            a.isactive, a.created, a.createdby, 
            a.updated, a.updatedby, a.fkr_id, a.m_produk_id,mp.kode AS kode_produk,mp.kode_sap,
            mp.nama AS nama_barang,
            COALESCE(rst.keterangan,a.satuan) AS satuan,
            a.total_retur, a.expired_gudang, a.expired_toko, a.damage, a.recall, 
            a.retur_administratif, a.rusak_di_jalan, a.misspart, a.peralihan, 
            a.repalcement, a.delisting, a.keterangan
            FROM fkr_detail a
            LEFT JOIN r_satuan_terkecil rst ON (a.satuan = rst.kode)
            ,m_produk mp
            WHERE a.fkr_id='${fkr_id}'
            AND a.m_produk_id = mp.m_produk_id`;
          let dataDetails = await request.query(queryDetail);
          let details = dataDetails.recordset;

          for (let j = 0; j < details.length; j++) {
            details[j].nomor = j + 1;

            let fkr_detail_id = details[j].fkr_detail_id;
            let sqlFkrDetails = `SELECT COUNT(1) AS total_rows FROM fkr_detail_eksekusi WHERE fkr_detail_id='${fkr_detail_id}'`;
            let dataDetailsEksekusi = await request.query(sqlFkrDetails);
            let detailseksekusi = dataDetailsEksekusi.recordset[0];

            if (detailseksekusi.total_rows > 0) {
              details[j].action_button = "EDV";
            } else {
              details[j].action_button = "EX";
            }
          }

          rows[i].lines = details;
        }

        let finalresult = undefined;
        if (rolename == "DISTRIBUTOR") {
          finalresult = rows;
        } else {
          //finalresult =  rows.filter(e => e.isapprove=='Y');
          finalresult = rows;
        }

        // console.log(finalresult);
        return res.success({
          result: finalresult,
          meta,
          message: "Fetch data successfully",
        });
      });
    } catch (err) {
      return res.error(err);
    }
  },

  findApproveCeo: async function (req, res) {
    const {
      query: {
        currentPage,
        pageSize,
        m_user_id,
        eksekusi,
        periode,
        jenis,
        status,
        r_distribution_channel_id,
        m_pajak_v_id,
        region_id,
        searchText,
      },
    } = req;
    // console.log(req.periode,req.jenis);

    await DB.poolConnect;
    try {
      const request = DB.pool.request();
      const { limit, offset } = calculateLimitAndOffset(currentPage, pageSize);
      const whereClause = req.query.filter ? `AND ${req.query.filter}` : "";

      let sqlGetRole = `SELECT murv.*,fraa.amount FROM m_user_role_v murv 
      LEFT JOIN fkr_role_amount_approve fraa ON(fraa.m_role_id = murv.m_role_id)
      WHERE m_user_id='${m_user_id}'`;
      console.log("getroleee  ", sqlGetRole);

      let datarole = await request.query(sqlGetRole);
      let rolename =
        datarole.recordset.length > 0 ? datarole.recordset[0].nama : undefined;
      let channel_role =
        datarole.recordset.length > 0
          ? datarole.recordset[0].r_distribution_channel_id
          : undefined;
      let amount =
        datarole.recordset.length > 0 ? datarole.recordset[0].amount : 0;

      // console.log(sqlGetRole);
      // console.log('r_distribution_channel_id ',r_distribution_channel_id);
      // console.log('m_role_id ',m_role_id);
      // console.log('rolename ',rolename);
      // console.log('amount ',amount);

      let filterchannel = ``;
      let filterbyroles = ``;
      let filterbyamount = ``;
      let filtermpajak = ``;

      if (m_pajak_v_id) {
        filtermpajak = `AND m_pajak_id = '${m_pajak_v_id}' `;
      }

      if (rolename == `DISTRIBUTOR`) {
        let dt = await request.query(`SELECT b.* FROM m_user a
        inner join m_pajak b on a.r_organisasi_id = b.r_organisasi_id
        WHERE a.m_user_id = '${m_user_id}'`);

        console.log(dt);

        // console.log(`SELECT b.* FROM m_user a
        // inner join m_pajak b on a.r_organisasi_id = b.r_organisasi_id
        // WHERE a.m_user_id = '${m_user_id}'`);

        let m_pajak_id =
          dt.recordset.length > 0 ? dt.recordset[0].m_pajak_id : null;

        if (m_pajak_id) {
          filtermpajak = `AND m_pajak_id = '${dt.recordset[0].m_pajak_id}' `;
        }
      }

      // tambahan filter disin
      let filterperiod = "";
      if (req.query.periode) {
        filterperiod = ` AND convert(varchar(7),created,120) = '${req.query.periode}'`;
      }
      // ini end periodnya
      let filterperiodend = "";
      if (req.query.periode) {
        filterperiodend = ` AND convert(varchar(7),created,120) = '${req.query.periode}'`;
      }

      let filterjenisbetween = ``;
      if (filterperiod && filterperiodend) {
        filterjenisbetween = `AND CONVERT(VARCHAR(7),created,120) BETWEEN '${req.query.periode}' AND '${req.query.periode}'`;
      }

      let filterjenisfkr = "";
      if (req.query.jenis) {
        filterjenisfkr = ` AND kode_eksekusi = '${req.query.jenis}'`;
      }

      let filterjeniseksekusi = "";
      if (req.query.jenis_eksekusi) {
        filterjeniseksekusi = ` AND eksekusi = '${req.query.jenis_eksekusi}'`;
      }

      let filterkodestatus = "";
      if (req.query.kode_status) {
        filterkodestatus = ` AND kode_status = '${req.query.kode_status}'`;
      }

      // console.log(filterperiod);
      // console.log(filterperiodend);
      // sampai sini
      let org = `SELECT distinct mdpv.r_organisasi_id FROM m_distributor_profile_v mdpv 
      inner join m_user b on b.username = mdpv.kode_sold_to 
      WHERE mdpv.m_user_id = '${m_user_id}'`;

      //console.log(org);
      let orgs = await request.query(org);

      console.log(org,">>>>>>>>> org");

      if (orgs.recordset.length === 0) {
        let org = `SELECT distinct mdpv.r_organisasi_id FROM m_distributor_profile_v mdpv 
        inner join m_user b on b.username = mdpv.kode_ship_to 
        WHERE b.m_user_id = '${m_user_id}'`;

        orgs = await request.query(org);
      }

      let organization = orgs.recordset.map(function (item) {
        return item["r_organisasi_id"];
      });

      console.log(organization);

      let valueIN = "";
      let listOrg = "";
      let listRegion = "";
      for (const datas of organization) {
        valueIN += ",'" + datas + "'";
      }

      if (region_id) {
        listRegion = `AND kode_region = '${region_id}'`;
      }

      valueIN = valueIN.substring(1);

      console.log(valueIN,">>>>>>>>>>");

      console.log(rolename);

      if (rolename == "ASDH") {
        filterbyroles = `AND kode_status IN ('DRAFT','RJC','APA','APR','APL','APF','APS3'
        ,'APS2','APS1','WT1','WT2','WT3','WT4','WT5','WT6','WT7','WT8','WT9','WT10','WT11','WT12','WT0')`;
        listOrg =
          organization.length > 0 && req.query.filter === undefined
            ? `AND r_organisasi_id IN (${valueIN})`
            : "";
      } else if (rolename == "RSDH") {
        filterbyroles = `AND kode_status IN ('RJC','APA','APR','APL','APF','APS3','APS2','APS1','WT1','WT2'
        ,'WT3','WT4','WT5','WT6','WT7','WT8','WT9','WT10','WT11','WT12','WT0')`;
        listOrg =
          organization.length > 0 && req.query.filter === undefined
            ? `AND r_organisasi_id IN (${valueIN})`
            : "";
      } else if (rolename == "LOGISTIK" || rolename == "FKR LOGISTIK") {
        filterbyroles = `AND (kode_status IN ('APL','APF','WT0','APS3','APS2','APS1','WT1','WT2','WT3','WT4','WT5','WT6','WT7','WT8','WT9','WT10','WT11','WT12') or status in ('Success Approve','BAP Belum Diterima Logistik','Menunggu BAP dari Logistik')) `;
      } else if (rolename == "ACCOUNTING") {
        filterbyroles = `AND kode_status IN ('APL','APF','APS3','APS2','APS1','WT1','WT2','WT3','WT4','WT5','WT6','WT7','WT8','WT9','WT10','WT11','WT12')`;
      } else if (rolename == "SALESHO1") {
        filterbyroles = `AND status = 'On Progress'`;
        filterbyamount = `AND amount >= ${amount}`;
      } else if (rolename == "SALESHO2") {
        filterbyroles = `AND kode_status IN ('APS1')`;
        filterbyamount = `AND amount >= ${amount}`;
      } else if (rolename == "SALESHO3") {
        // console.log(rolename,channel_role);
        if (channel_role == "AD89DBFA-200C-4C2C-9D56-F507771BED9E") {
          filterchannel = `AND r_distribution_channel_id in ('${channel_role}','CC46832D-0CF1-4AE2-A3A3-B9B9D0B81800','F7A81901-FFB9-41F6-9AB4-AF5FA0029B49')`;
        } else {
          filterchannel = `AND r_distribution_channel_id in ('${channel_role}')`;
        }
        filterbyroles = `AND kode_status IN ('RJC','APL','APF','WT0','APS3','APS2','APS1','APR','WT1','WT2','WT3','WT4','WT5','WT6','WT7','WT8','WT9','WT10')`;
      } else if (rolename == "DISTRIBUTOR") {
        filterbyroles = `AND kode_status IN ('WAITINGSO','RJC','DRAFT','APA','WT0','APR','APL','APF','APS3','APS2','APS1','WT1','WT2','WT3','WT4','WT5','WT6','WT7','WT8','WT9','WT10','WT11','WT12')`;
        listOrg =
          organization.length > 0 && req.query.filter === undefined
            ? `AND r_organisasi_id IN (${valueIN})`
            : "";
      } else if (rolename == "SALESGTREGIONKLAIM") {
        // filterbyroles = `AND kode_status IN ('DRAFT','APA','APR','APL','APF','APS3','APS2','APS1','WT1','WT2','WT3','WT4','WT5','WT6','WT7','WT8','WT9','WT10')`;
      } else if (rolename == "SALESMTREGIONKLAIM") {
        // filterbyroles = `AND kode_status IN ('DRAFT','APA','APR','APL','APF','APS3','APS2','APS1','WT1','WT2','WT3')`;
        // filterbyroles = `AND kode_status IN ('DRAFT','APA','APR','APL','APF','APS3','APS2','APS1','WT1','WT2','WT3','WT4','WT5','WT6','WT7','WT8','WT9','WT10')`;
      } else if (rolename == "SALESMTREGIONKLAIM") {
        // filterbyroles = `AND kode_status IN ('DRAFT','APA','APR','APL','APF','APS3','APS2','APS1','WT1','WT2','WT3','WT4','WT5','WT6','WT7','WT8','WT9','WT10')`;
      } else if (rolename == "SALESFINANCE") {
        filterbyroles = `AND kode_status IN ('WT8','WT9','WT10','WT11','WT12')`;
      } else {
        // return res.error('ROLE TIDAK DAPAT MELAKUKAN APPROVE');
        // filterbyroles = `AND kode_status IN ('DRAFT','APA','APR','APL','APF','APS3','APS2','APS1','WT1','WT2','WT3','WT4','WT5','WT6','WT7','WT8','WT9','WT10')`;
      }

      if (r_distribution_channel_id) {
        filterchannel = `AND r_distribution_channel_id = '${r_distribution_channel_id}'`;
      }

      if (req.query.status) {
        // if(req.query.status == 'APS2'){
        //   filterbyroles = ` AND (status = 'Success Approve' or status = 'BAP Diterima Logistik') `;
        // }else if(req.query.status == 'APS1'){
        //   filterbyroles = ` AND status = 'On Progress' `;
        // }else{
        //   filterbyroles = ` AND kode_status = '${req.query.status}' `;
        // }
        if (req.query.status == "OP") {
          filterbyroles = ` AND status = 'On Progress' `;
        } else if (req.query.status == "MBK") {
          filterbyroles = ` AND (status = 'BAP Belum Diterima Logistik')`;
        } else if (req.query.status == "SA") {
          filterbyroles = ` AND status in ('Success Approve','BAP Diterima Logistik','Menunggu BAP dari Logistik')`;
        } else {
          filterbyroles = ` AND kode_status = '${req.query.status}' `;
        }
      }

      let filtereksekusi = ``;
      if (eksekusi) {
        filtereksekusi = `AND kode_eksekusi = '${eksekusi}'`;
      }

      let filterlike = ``;
      if (searchText) {
        filterlike = ` AND (nomor_so like '%${searchText}%' or nomor_fkr like '%${searchText}%' or eksekusi like '%${searchText}%' or nomor_gi like '%${searchText}%' or nomor_cn like '%${searchText}%')`;
      }

      let queryCountTable = `SELECT COUNT(1) AS total_rows
                              FROM fkr_v WHERE 1=1 ${whereClause} ${listOrg} ${filterchannel} ${filterbyroles} ${filterbyamount}
                              ${filterperiod} ${filterjenisfkr} ${filtermpajak} ${filterlike} ${listRegion} ${filterjeniseksekusi} ${filterkodestatus} `;

      let queryDataTable = `SELECT *
                            FROM fkr_v WHERE 1=1
                            ${whereClause} ${listOrg} ${filterchannel} ${filterbyroles} ${filterbyamount}
                            ${filterperiod} ${filterjenisfkr} ${filtermpajak} ${filterlike} ${listRegion}
                            ${filterjeniseksekusi} ${filterkodestatus}
                            ORDER BY created DESC
                            OFFSET ${offset} ROWS
                            FETCH NEXT ${limit} ROWS ONLY`;

    console.log(queryDataTable,">>>>>>>>>>>>>>>>>>>>>>>>>>>>>>")
      // console.log("querynya ",queryDataTable);

      const totalItems = await request.query(queryCountTable);
      const count = totalItems.recordset[0].total_rows || 0;

      request.query(queryDataTable, async (err, result) => {
        if (err) {
          return res.error(err);
        }

        const rows = result.recordset;
        const meta = paginate(currentPage, count, rows, pageSize);

        for (let i = 0; i < rows.length; i++) {
          let fkr_id = rows[i].fkr_id;
          let queryDetail = `SELECT a.fkr_detail_id, 
            a.isactive, a.created, a.createdby, 
            a.updated, a.updatedby, a.fkr_id, a.m_produk_id,mp.kode AS kode_produk,mp.kode_sap,
            mp.nama AS nama_barang,
            COALESCE(rst.keterangan,a.satuan) AS satuan,
            a.total_retur, a.expired_gudang, a.expired_toko, a.damage, a.recall, 
            a.retur_administratif, a.rusak_di_jalan, a.misspart, a.peralihan, 
            a.repalcement, a.delisting, a.keterangan
            FROM fkr_detail a
            LEFT JOIN r_satuan_terkecil rst ON (a.satuan = rst.kode)
            ,m_produk mp
            WHERE a.fkr_id='${fkr_id}'
            AND a.m_produk_id = mp.m_produk_id`;
          let dataDetails = await request.query(queryDetail);
          let details = dataDetails.recordset;

          for (let j = 0; j < details.length; j++) {
            details[j].nomor = j + 1;

            let fkr_detail_id = details[j].fkr_detail_id;
            let sqlFkrDetails = `SELECT COUNT(1) AS total_rows FROM fkr_detail_eksekusi WHERE fkr_detail_id='${fkr_detail_id}'`;
            let dataDetailsEksekusi = await request.query(sqlFkrDetails);
            let detailseksekusi = dataDetailsEksekusi.recordset[0];

            if (detailseksekusi.total_rows > 0) {
              details[j].action_button = "EDV";
            } else {
              details[j].action_button = "EX";
            }
          }

          rows[i].lines = details;
        }

        let finalresult = undefined;
        if (rolename == "DISTRIBUTOR") {
          finalresult = rows;
        } else {
          finalresult = rows;
        }

        return res.success({
          result: finalresult,
          meta,
          message: "Fetch data successfully",
        });
      });
    } catch (err) {
      return res.error(err);
    }
  },

  countFkrApprove: async function (req, res) {
    const { m_user_id } = req.query;
    console.log(m_user_id);

    const request = DB.pool.request();
    try {
      // let jumlahApprove = `SELECT COUNT(*) as jumlah_approval FROM fkr_v WHERE 1=1
      // AND status = 'On Progress' AND amount >= 500000000`;
      // let dataApprove = await request.query(jumlahApprove);
      let totalData = 0;

      return res.send({
        error: "false",
        totalData: totalData,
        message: "Berhasil ....",
      });
    } catch (err) {
      return res.error({
        error: "true",
        result: null,
        message: "Gagal",
      });
    }
  },

  notifikasifkr: async function (req, res) {
    const { m_user_id } = req.body;
    await DB.poolConnect;
    try {
      console.log(m_user_id);
      const request = DB.pool.request();
      let selNotif = `SELECT m_user_id,kode_status,notif_desc,count(*) jml FROM notifikasi_fkr WHERE m_user_id = '${m_user_id}' 
                        AND isactive is null group by m_user_id,kode_status,notif_desc`;
      selNotif = await request.query(selNotif);
      let dsnotif = selNotif.recordset;

      let notifRow = `SELECT count(*)jml FROM notifikasi_fkr WHERE m_user_id = '${m_user_id}' AND isactive is null`;
      notifRow = await request.query(notifRow);
      let dsNotifRow = notifRow.recordset;
      dsNotifRow = dsNotifRow[0].jml;

      let finalresult = {
        jumlah: dsNotifRow,
        rowdata: dsnotif,
      };
      // console.log(finalresult);

      return res.success({
        result: finalresult,
        message: "Sukses",
      });
    } catch (err) {
      return res.error(err);
    }
  },
  // GET ONE RESOURCE
  findOne: async function (req, res) {
    const {
      query: { m_user_id },
    } = req;
    const fkr_id = req.param("id");

    await DB.poolConnect;
    try {
      const request = DB.pool.request();

      let sqlGetRole = `SELECT * FROM m_user_role_v_new WHERE m_user_id='${m_user_id}'`;
      let datarole = await request.query(sqlGetRole);
      let roleAcess = datarole.recordset;
      let rolename = datarole.recordset.length > 0 ? datarole.recordset[0].nama : null;

      let ceknomor_so = `SELECT * FROM fkr WHERE fkr_id = '${fkr_id}'`;
      let dataso = await request.query(ceknomor_so);
      let kodestatusExisting = dataso.recordset[0].kode_status;

      let objectRoleAccessId = null;
      let roleAccessId = null;

      if (checkRole(roleAcess, ["SALESHO1"])) {
        rolename = "SALESHO1";
        objectRoleAccessId = roleAcess.find((e) => e.nama == "SALESHO1");
      } else if (checkRole(roleAcess, ["SALESHO2"])) {
        rolename = "SALESHO2";
        objectRoleAccessId = roleAcess.find((e) => e.nama == "SALESHO2");
      } else if (checkRole(roleAcess, ["SALESHO3"])) {
        rolename = "SALESHO3";
        objectRoleAccessId = roleAcess.find((e) => e.nama == "SALESHO3");
      } else if (
        checkRole(roleAcess, ["ASDH"]) &&
        kodestatusExisting == "WAITINGSO"
      ) {
        rolename = "ASDH";
        objectRoleAccessId = roleAcess.find((e) => e.nama == "ASDH");
      } else if (
        checkRole(roleAcess, ["RSDH"]) &&
        kodestatusExisting == "APA"
      ) {
        rolename = "RSDH";
        objectRoleAccessId = roleAcess.find((e) => e.nama == "RSDH");
      } else if (checkRole(roleAcess, ["LOGISTIK"])) {
        rolename = "LOGISTIK";
        objectRoleAccessId = roleAcess.find((e) => e.nama == "LOGISTIK");
      } else if (checkRole(roleAcess, ["FKR LOGISTIK"])) {
        rolename = "FKR LOGISTIK";
        objectRoleAccessId = roleAcess.find((e) => e.nama == "FKR LOGISTIK");
      } else if (checkRole(roleAcess, ["ACCOUNTING"])) {
        rolename = "ACCOUNTING";
        objectRoleAccessId = roleAcess.find((e) => e.nama == "ACCOUNTING");
      } else {
        if (checkRole(roleAcess, ["RSDH"])) {
          rolename = "RSDH";
          objectRoleAccessId = roleAcess.find((e) => e.nama == "RSDH");
        } else if (checkRole(roleAcess, ["ASDH"])) {
          rolename = "ASDH";
          objectRoleAccessId = roleAcess.find((e) => e.nama == "ASDH");
        } else if (
          checkRole(roleAcess, ["ASDH"]) &&
          checkRole(roleAcess, ["RSDH"])
        ) {
          rolename = "RSDH";
          objectRoleAccessId = roleAcess.find((e) => e.nama == "RSDH");
        }
      }

      if (objectRoleAccessId) {
        roleAccessId = objectRoleAccessId.m_role_id;
      }

      // console.log("roleAccessId ", roleAccessId);
      // console.log(rolename);
      let queryDataTable = `SELECT a.fkr_id,
      a.isactive, a.created,
      a.createdby, a.updated, a.updatedby,
      a.nomor_fkr,a.nomor_so,
      a.bulan, a.tahun,
      a.nomor_gi,a.nomor_cn,
      a.m_distributor_id,
      rop.nama AS nama_pajak,
      rmd .nama AS nama_distributor,
      rdc.nama AS nama_channel,
      mdv.r_distribution_channel_id,
      rop.kode,
      isnull(x.nama,'MI') as tujuan_retur, a.amount,
      a.kode_status,
      case when kode_status = 'WT2' AND  eksekusi = 'Pemusnahan Lokal' then 'Waiting Pemusnahan Barang' else a.status end  as status,
      '${rolename}' as roles,
      a.file_bast,
      CASE WHEN a.eksekusi = 'PENGEMBALIAN' THEN 'Reguler Fisik'
                            WHEN a.eksekusi = 'PEMUSNAHAN' THEN 'Pemusnahan Lokal'
                            WHEN a.eksekusi = 'PENGALIHAN' THEN 'Peralihan' END AS eksekusi,
      isconfirm_logistik as isuploadlogistik,
      case when isconfirm_logistik = 'Y' then 'Y' else 'N' end as isdownloadbap,
      isconfirm_dtb,
      doc_ba,
      doc_dtb1,
      doc_dtb2,
      doc_dtb3,
      doc_dtb4,
      eksekusi as eksekusi_fkr,
      doc_nrp_dtb,
      dok_do,
      dok_cn,
      nomor_resi,
      periode_pengajuan,
      nomor_so_alihan,
      convert(varchar(10),a.created,120) as pengajuan,
      confirm_ba_alihan,last_status,last_kode_status,hold_note,
      tgl_penarikan
      FROM fkr a 
      left join m_distributor mdv on a.m_distributor_id = mdv.m_distributor_id
      left join r_distribution_channel rdc on rdc.r_distribution_channel_id = mdv.r_distribution_channel_id
      left join r_organisasi rmd on rmd.r_organisasi_id = mdv.r_organisasi_id 
      left join m_pajak mp on mp.m_pajak_id = mdv.m_pajak_id 
      left join r_organisasi rop on rop.r_organisasi_id = mp.r_organisasi_id 
      left join m_distributor_v x on x.m_distributor_id = a.tujuan_retur
      WHERE fkr_id ='${req.param("id")}'  `;

      //console.log(queryDataTable);

      request.query(queryDataTable, async (err, result) => {
        if (err) {
          return res.error(err);
        }

        const row = result.recordset[0]; // berrti disini , karena row pertama kali di set dari hasil query ini
        let url = "http://esales.enesis.com:8000/eprop/getsellindisti.php";
        let formData = {
          dist_id: row.kode,
          year: row.tahun,
          month: row.bulan,
        };

        const encodeForm = (data) => {
          return Object.keys(data)
            .map(
              (key) =>
                encodeURIComponent(key) + "=" + encodeURIComponent(data[key])
            )
            .join("&");
        };

        let datasellin = await axios.post(url, encodeForm(formData), {
          headers: {
            Accept: "application/json",
          },
        });

        // datasellin = null;
        //console.log(datasellin.data);
        let sell_in = 0;
        let persentase_sell_in = 0;
        try {
          sell_in = datasellin.data.data ? Number(datasellin.data.data) : 0;
          persentase_sell_in = sell_in > 0 ? row.amount / sell_in : 0;
        } catch (error) {}

        // console.log('amount ',row.amount);
        // console.log('sell_in ',sell_in);
        // console.log('persentase_sell_in ',persentase_sell_in);

        let headers = {
          m_distributor_id: row.m_distributor_id,
          bulan: row.bulan,
          tahun: row.tahun,
          nomor_fkr: row.nomor_fkr,
          nomor_gi: row.nomor_gi,
          nomor_cn: row.nomor_cn,
          nomor_so: row.nomor_so,
          tujuan_retur: row.tujuan_retur,
          nama_pajak: row.nama_pajak,
          nama_distributor: row.nama_distributor,
          status: row.status, // ketemu disini... kita test apakah benar
          nama_channel: row.nama_channel,
          tujuan_retur: row.tujuan_retur,
          amount: row.amount,
          sell_in: sell_in,
          persentase_sell_in: persentase_sell_in,
          file_bast: row.file_bast,
        };

        row.sell_in = sell_in;
        row.persentase_sell_in = persentase_sell_in;

        //upload logistik
        row.isuploadlogistik = row.isuploadlogistik;
        row.isdownloadbap = row.isdownloadbap;

        let fkr_id = row.fkr_id;
        let queryDetail = `SELECT a.fkr_detail_id, 
        a.isactive, a.created, a.createdby, 
        a.updated, a.updatedby, a.fkr_id, a.m_produk_id,
        COALESCE(rst.keterangan,a.satuan) AS satuan,
        mp.kode AS kode_produk,
        mp.kode_sap,
        mp.nama AS nama_barang,
        a.total_retur, 
        a.expired_gudang, a.expired_toko, a.damage, a.recall, 
        a.retur_administratif, a.rusak_di_jalan, a.misspart, a.peralihan,
        a.repalcement, a.delisting, a.keterangan,amount_item
        FROM fkr_detail a
        LEFT JOIN r_satuan_terkecil rst ON (a.satuan = rst.kode)
        ,m_produk mp
        WHERE a.fkr_id='${fkr_id}'
        AND a.m_produk_id = mp.m_produk_id
        order by mp.kode_sap`;
        //console.log(queryDetail);

        let dataDetails = await request.query(queryDetail);
        let details = dataDetails.recordset;

        let sqlRoleApprove = `SELECT
        ROW_NUMBER() OVER (
          ORDER BY fraa.amount
             ) line,
        fraa.m_role_id,
        CASE WHEN faa.actions IS NULL THEN 'BELUM' ELSE 'SUDAH' END AS isprosesapprove
        FROM fkr_role_amount_approve fraa
        LEFT JOIN fkr_audit_approve faa ON (faa.m_role_id = fraa.m_role_id AND faa.fkr_id = '${fkr_id}'
        AND faa.m_role_id=fraa.m_role_id AND faa.isactive='Y')
        LEFT JOIN m_role mr ON mr.m_role_id = fraa.m_role_id
        AND mr.nama = '${rolename}'
        WHERE fraa.amount <= ${row.amount} ORDER BY fraa.amount`;

        // console.log(sqlRoleApprove);

        let cekstatusAsdh = `
        SELECT COUNT(1) AS status,max(actions)act
        FROM fkr_audit_approve 
        WHERE fkr_id = '${fkr_id}' AND kode_status='APA' AND isactive='Y'`;

        let datastatusasdh = await request.query(cekstatusAsdh);
        let statusASDH = datastatusasdh.recordset[0].status;
        //let tgl_approve_asdh = datastatusasdh.recordset.length > 0 ? datastatusasdh.recordset[0].tgl_approve : null;

        let cekstatusRsdh = `
        SELECT COUNT(1) AS status,max(actions)act
        FROM fkr_audit_approve 
        WHERE fkr_id = '${fkr_id}' AND kode_status='APR' AND isactive='Y'`;

        let datastatusrsdh = await request.query(cekstatusRsdh);
        let statusRSDH = datastatusrsdh.recordset[0].status;
        //let tgl_approve_rsdh = datastatusrsdh.recordset.length > 0 ? datastatusrsdh.recordset[0].tgl_approve : null;
        let dataprogress = [];

        //console.log('statusASDH ',statusASDH);

        let status_asdh = "Belum diproses";
        let approve_asdh = "-";
        if (statusASDH > 0) {
          status_asdh = datastatusasdh.recordset[0].act;
          approve_asdh = status_asdh;
        }

        let status_rsdh = "Belum diproses";
        let approve_rsdh = "-";
        if (statusRSDH > 0) {
          status_rsdh = datastatusrsdh.recordset[0].act;
          approve_rsdh = status_rsdh;
        }

        let user1 = `SELECT mr.nama,
        CASE WHEN mr.nama = 'SALESHO3' THEN (SELECT nama FROM sales_head WHERE r_distribution_channel_id = '${row.r_distribution_channel_id}')
        WHEN mr.nama = 'SALESHO2' then (SELECT TOP 1 nama_csmo FROM param_global ORDER BY created DESC)
        WHEN mr.nama = 'SALESHO1' then (SELECT TOP 1 nama_ceo FROM param_global ORDER BY created DESC)
        END AS approval , 
        CASE WHEN mr.nama = 'SALESHO3' THEN (SELECT m_user_id FROM sales_head WHERE r_distribution_channel_id = '${row.r_distribution_channel_id}')
        WHEN mr.nama = 'SALESHO2' then (SELECT TOP 1 m_user_csmo_id FROM param_global ORDER BY created DESC)
        WHEN mr.nama = 'SALESHO1' then (SELECT TOP 1 m_user_ceo_id FROM param_global ORDER BY created DESC)
        END AS m_user_id , 
        CASE WHEN mr.nama = 'SALESHO3' THEN 'SALES HEAD'
        WHEN mr.nama = 'SALESHO2' then 'CSO'
        WHEN mr.nama = 'SALESHO1' then 'CEO'
        END AS roleposition ,case when d.created is null then'Belum diproses' else actions end as status
        ,isnull(CONVERT(VARCHAR(10),d.created,120),'-') AS approvedate
        ,note
        FROM fkr_role_amount_approve fraa,
        m_role mr
        left join fkr_audit_approve d on d.m_role_id = mr.m_role_id AND d.fkr_id = '${fkr_id}' AND d.isactive='Y'
        WHERE fraa.m_role_id = mr.m_role_id AND fraa.amount <= ${row.amount} ORDER BY fraa.amount DESC`;

        // console.log("approval fkr 1",user1);

        let getdatauser1 = await request.query(user1);
        let datauser1 = getdatauser1.recordset;

        console.log(user1,">>>>>>>");

        // console.log('datauser1 ',datauser1);

        if (row.amount >= 0) {
          for (let i = 0; i < datauser1.length; i++) {
            datauser1[i].line = 1;
            dataprogress.push(datauser1[i]);
          }
        }

        let user2 = `SELECT TOP 1 m_user_id,nama_user AS approval
        ,'RSM' AS roleposition, 
        '${status_rsdh}' AS status,
        isnull(CONVERT(VARCHAR(10),faa.created,120),'-') AS approvedate,
        note
        FROM m_distributor_profile_v  
        LEFT JOIN fkr_audit_approve faa ON (faa.kode_status='APR' AND faa.fkr_id = '${fkr_id}' AND faa.isactive='Y')
        WHERE m_distributor_id='${row.m_distributor_id}' AND rolename='RSDH'`;

        let getdatauser2 = await request.query(user2);
        let datauser2 = getdatauser2.recordset;

        for (let i = 0; i < datauser2.length; i++) {
          datauser2[i].line = 2;
          dataprogress.push(datauser2[i]);
        }

        let user3 = `SELECT TOP 1 m_user_id,nama_user AS approval
        ,'ASM' AS roleposition, 
        '${status_asdh}' AS status,
        isnull(CONVERT(VARCHAR(10),faa.created,120),'-') AS approvedate,
        note
        FROM m_distributor_profile_v  
        LEFT JOIN fkr_audit_approve faa ON (faa.kode_status='APA' AND faa.fkr_id = '${fkr_id}' AND faa.isactive='Y')
        WHERE m_distributor_id='${row.m_distributor_id}' AND rolename='ASDH'`;

        let getdatauser3 = await request.query(user3);
        let datauser3 = getdatauser3.recordset;

        for (let i = 0; i < datauser3.length; i++) {
          datauser3[i].line = 3;
          dataprogress.push(datauser3[i]);
        }

        let dataauditapprove = await request.query(sqlRoleApprove);
        let auditFilterByRoleId = dataauditapprove.recordset.filter(
          (e) => e.m_role_id == roleAccessId
        );
        let approveinfoaudit =
          auditFilterByRoleId.length > 0
            ? auditFilterByRoleId[0].isprosesapprove
            : "NOTROLE";

        let lineaudit = dataauditapprove.recordset;
        let getline = lineaudit.filter((e) => e.m_role_id == roleAccessId);

        let sqlmaxaps = `SELECT CONCAT('APS',COUNT(1)) AS maxaps
        FROM fkr_role_amount_approve fraa
        WHERE fraa.amount <= ${row.amount}`;
        let datamaxaps = await request.query(sqlmaxaps);
        let maxaps = datamaxaps.recordset[0].maxaps;

        let sqlLineUpdate = `SELECT 
        CASE WHEN kode_status IS NULL THEN 0
        WHEN kode_status='APA' THEN 0
        WHEN kode_status='APR' THEN 1
        WHEN kode_status='APS1' THEN 2
        WHEN kode_status='APS2' THEN 3
        WHEN kode_status='APS3' THEN 4
        ELSE 0 END AS lineupdate
        FROM fkr f WHERE fkr_id='${fkr_id}'`;

        let datalineupdadate = await request.query(sqlLineUpdate);
        let lineupdate =
          datalineupdadate.recordset.length > 0
            ? datalineupdadate.recordset[0].lineupdate
            : 0;

        if (checkRole(roleAcess, ["SALESHO1", "SALESHO2", "SALESHO3"])) {
          // console.log('lineaudit ',getline.length);
          // console.log('lineupdate ',lineupdate);
          // console.log('approveinfoaudit ',approveinfoaudit);
          // console.log('checkUserSalesHO(datauser1,m_user_id) ',checkUserSalesHO(datauser1,m_user_id));
          let showButtonApproval = false;

          if (lineupdate == 1 && rolename == "SALESHO3") {
            showButtonApproval = true;
          } else if (lineupdate == 2 && rolename == "SALESHO2") {
            showButtonApproval = true;
          }
          if (lineupdate == 3 && rolename == "SALESHO1") {
            showButtonApproval = true;
          }

          if (
            approveinfoaudit == "BELUM" &&
            getline.length > 0 &&
            checkUserSalesHO(datauser1, m_user_id) &&
            showButtonApproval
          ) {
            let isapprove = "Y";
            row.isapprove = isapprove;
            row.isreject = isapprove;
          } else {
            let isapprove = "N";
            row.isapprove = isapprove;
            row.isreject = isapprove;
          }
        } else {
          if (checkRole(roleAcess, ["ASDH"]) && row.kode_status == "DRAFT") {
            let isapprove = "Y";
            row.isapprove = isapprove;
            row.isreject = isapprove;
          } else if (
            checkRole(roleAcess, ["RSDH"]) &&
            row.kode_status == "APA"
          ) {
            let isapprove = "Y";
            row.isapprove = isapprove;
            row.isreject = isapprove;
          } else if (
            checkRole(roleAcess, ["LOGISTIK"]) &&
            row.kode_status == maxaps
          ) {
            let isapprove = "Y";
            row.isapprove = "N";
            row.isreject = isapprove;
          } else if (
            checkRole(roleAcess, ["FKR LOGISTIK"]) &&
            row.kode_status == "WT1"
          ) {
            // console.log("masuk sini...");
            let isapprove = "Y";
            row.isapprove = "N";
            row.isreject = isapprove;
          } else if (
            checkRole(roleAcess, ["ACCOUNTING"]) &&
            row.kode_status == "APL"
          ) {
            let isapprove = "Y";
            row.isapprove = isapprove;
            row.isreject = isapprove;
          } else {

            let sqlCheckDataSalesHead = `SELECT COUNT(1) AS jumlahData FROM sales_head WHERE m_user_id = '${m_user_id}'`;
            let dataSalesHead = await request.query(sqlCheckDataSalesHead);
            let jumlahData = dataSalesHead.recordset[0].jumlahData;
    
            if(jumlahData > 0 && kodestatusExisting == 'APR'){
    
              let isapprove = "Y";
              row.isapprove = isapprove;
              row.isreject = isapprove;
    
            }else{
    
              let isapprove = "N";
              row.isapprove = isapprove;
              row.isreject = isapprove;
            
            }

          }
        }

        // dataprogress = _.uniqBy(dataprogress, "m_user_id");
        //console.log(dataprogress);
        for (let i = 0; i < dataprogress.length; i++) {
          dataprogress[i].line = i + 1;
          // dataprogress[i].approvedate = moment(dataprogress[i].approvedate,'YYYY-MM-DD').format('YYYY-MM-DD');
        }

        for (let j = 0; j < details.length; j++) {
          let fkr_detail_id = details[j].fkr_detail_id;
          let sqlFkrDetails = `SELECT COUNT(1) AS total_rows FROM fkr_detail_eksekusi WHERE fkr_detail_id='${fkr_detail_id}'`;
          let dataDetailsEksekusi = await request.query(sqlFkrDetails);
          let detailseksekusi = dataDetailsEksekusi.recordset[0];

          if (detailseksekusi.total_rows > 0) {
            details[j].action_button = "EDV";
          } else {
            details[j].action_button = "EX";
          }

          details[j].nomor = j + 1;
        }

        let sqlCheckDataProgress = `SELECT convert(varchar(10),created,120) as tgl_proses,status FROM fkr_audit_new WHERE fkr_id = '${fkr_id}' ORDER BY created asc`;
        // console.log(sql check data progress, );
        let getdatasteps = await request.query(sqlCheckDataProgress);
        let datasteps = getdatasteps.recordset;


        // console.log(dataprogress);


        for (let i = 0; i < dataprogress.length; i++) {

          if(dataprogress[i].nama){

            let userId = dataprogress[i].m_user_id;

            let sqlCheckDataApproval = `SELECT CONVERT(VARCHAR(10),created,120) AS approvedate FROM fkr_audit_approve WHERE fkr_id = '${fkr_id}' AND m_role_id = '${userId}'`;
            let checkDataApproval = await request.query(sqlCheckDataApproval);
            let jumlahDataApproval = checkDataApproval.recordset.length > 0 ? 1 : 0;
            let approvedate = checkDataApproval.recordset.length > 0 ? checkDataApproval.recordset[0].approvedate : '-';
  
            if(jumlahDataApproval > 0){
              dataprogress[i].status = 'APPROVE';
              dataprogress[i].approvedate = approvedate;
            }
          
          }
          
          
        }

        row.lines = details;
        row.headers = headers;
        row.progress = dataprogress;



        for (let i = 0; i < datasteps.length; i++) {
          datasteps[i].lines = i + 1;
        }


        row.steps = datasteps;

        //kuncinya kan disini, gw cari key status itu, objectnya header kita telusuri
        //console.log(row);
        return res.success({
          result: row,
          message: "Fetch data successfully",
        });
      });
    } catch (err) {
      return res.error(err);
    }
  },
  holdfkr: async function (req, res) {
    const { m_user_id, fkr_id, pesan } = req.body;
    console.log(pesan);
    await DB.poolConnect;
    try {
      const request = DB.pool.request();
      let sel = `SELECT * FROM fkr WHERE fkr_id = '${fkr_id}'`;
      let dssel = await request.query(sel);
      let kode_status = dssel.recordset[0].kode_status;
      let status = dssel.recordset[0].status;
      let last_kode_status = dssel.recordset[0].last_kode_status;
      let upd = ``;
      if (last_kode_status) {
        upd = `update fkr set kode_status = last_kode_status, status = last_status,last_status = null,last_kode_status = null
          ,hold_note = null WHERE fkr_id = '${fkr_id}'`;
      } else {
        upd = `update fkr set last_status = '${status}',last_kode_status = '${kode_status}'
          ,hold_note = '${pesan}',kode_status = 'WT0', status = 'Hold By Logistik' WHERE fkr_id = '${fkr_id}'`;
      }
      console.log(upd);
      await request.query(upd);
      return res.success({
        error: "false",
        result: null,
        message: "Success ",
      });
    } catch (e) {
      return res.error({
        error: "true",
        result: null,
        message: "Gagal mendapatkan Nomor FKR ....",
      });
    }
  },
  getfileBAP: async function (req, res) {
    // const user = req.param('user')
    console.log("xxxxxxxxxxxxxxxx");
    const record = req.param("record");
    const filename = req.param("filename");

    // console.log(record,filename);
    const filesamaDir = glob.GlobSync(
      path.resolve(dokumentPath("fkr_bap", record), filename + "*")
    );
    // console.log(filesamaDir);
    if (filesamaDir.found.length > 0) {
      // console.log(filesamaDir.found[0])

      // return res.send(filesamaDir.found[0]);
      // return res.success('OK');
      var lastItemAkaFilename = path.basename(filesamaDir.found[0]);
      // console.log(lastItemAkaFilename);
      return res.download(filesamaDir.found[0], lastItemAkaFilename);
    }
    return res.error("Failed, File Not Found");
  },

  getfileIOM: async function (req, res) {
    // const user = req.param('user')
    console.log("xxxxxxxxxxxxxxxx");
    const record = req.param("record");
    const filename = req.param("filename");

    // console.log(record,filename);
    const filesamaDir = glob.GlobSync(
      path.resolve(dokumentPath("fkr_iom", record), filename + "*")
    );
    // console.log(filesamaDir);
    if (filesamaDir.found.length > 0) {
      // console.log(filesamaDir.found[0])

      // return res.send(filesamaDir.found[0]);
      // return res.success('OK');
      var lastItemAkaFilename = path.basename(filesamaDir.found[0]);
      // console.log(lastItemAkaFilename);
      return res.download(filesamaDir.found[0], lastItemAkaFilename);
    }
    return res.error("Failed, File Not Found");
  },
  getfileBAPBalikan: async function (req, res) {
    // const user = req.param('user')
    console.log("zzzzzzzzzzzzzzzzz");
    const record = req.param("record");
    const filename = req.param("filename");
    const dir = req.param("fx");

    // console.log(record,filename);

    const filesamaDir = glob.GlobSync(
      path.resolve(dokumentPath(dir, record), filename + "*")
    );
    console.log("filesamaDir: ", filesamaDir);

    if (dir == "fkr_bap_kembali") {
      await DB.poolConnect;
      const request = DB.pool.request();
      try {
        // let cek = `SELECT * FROM fkr WHERE fkr_id = '${record}'`
        // let dtCek = await request.query(cek);
        // dtCek = dtCek.recordset
        // let file2 = dtCek[0].doc_dtb2
        // let file3 = dtCek[0].doc_dtb3
        // console.log(file2,file3);
        // const filesamaDir2 = glob.GlobSync(path.resolve(dokumentPath(dir, record), file2 + '*'));
        // const filesamaDir3 = glob.GlobSync(path.resolve(dokumentPath(dir, record), file3 + '*'));

        // console.log(filesamaDir2);
        // var dir2 = path.basename(filesamaDir2.found[0])
        // var dir3 = path.basename(filesamaDir3.found[0])
        // res.download(filesamaDir2.found[0], dir2)
        // res.download(filesamaDir3.found[0], dir3)
        console.log("CEK LOG ERROR CASE 1 ", filesamaDir);
        console.log("CEK LOG ERROR CASE 2 ", filesamaDir.found);
        var lastItemAkaFilename = path.basename(filesamaDir.found[0]);
        return res.download(filesamaDir.found[0], lastItemAkaFilename);
      } catch (err) {
        console.log(err);
      }
    } else {
      console.log(dir);
      if (filesamaDir.found.length > 0) {
        // console.log(filesamaDir.found[0])

        // return res.send(filesamaDir.found[0]);
        // return res.success('OK');
        var lastItemAkaFilename = path.basename(filesamaDir.found[0]);
        // console.log(lastItemAkaFilename);
        return res.download(filesamaDir.found[0], lastItemAkaFilename);
      }
    }
    return res.error("Failed, File Not Found");
  },

  saveFKRnew2: async function (req, res) {
    const { header, details, filename } = req.body;

    console.log("Ke FKR NEWWWWW plus iom");

    if (
      header.jenis_fkr == "Peralihan Distributor" &&
      header.tujuan_retur == "MI"
    ) {
      return res.error({
        error: "true",
        result: null,
        message:
          "Distributor tujuan retur kosong harap isi distributor tujuan retur",
      });
    } else {
      await DB.poolConnect;
      try {
        const request = DB.pool.request();
        let uploadFile = req.file("image");

        if (uploadFile && filename) {
          let query1 = `UPDATE fkr SET doc_dtb4 = '${filename}'
          WHERE fkr_id = '${header.fkr_id}'`;
          await uploadFilesKembali(header.fkr_id, uploadFile, "fkr_iom");
          await request.query(query1);
        }

        let DTB_query = `SELECT *,convert(varchar(10),getdate(),120) as today FROM m_distributor_v 
                         WHERE m_distributor_id = '${header.m_distributor_id}'`;
        let data_dtb = await request.query(DTB_query);
        data_dtb = data_dtb.recordset;
        let r_org = data_dtb[0].r_organisasi_id;
        let kode_shipto = data_dtb[0].kode;
        let today = data_dtb[0].today;
        let bulan = moment(today, "YYYY-MM-DD").format("MM");
        let tahun = moment(today, "YYYY-MM-DD").format("YYYY");
        let nomor = await generateNoFKR(r_org, kode_shipto, today);
        let amount = 0;
        for (let i = 0; i < details.length; i++) {
          amount = amount + details[i].nett;
        }
        if (nomor == "0") {
          return res.error({
            error: "true",
            result: null,
            message: "Gagal mendapatkan Nomor FKR ....",
          });
        } else {
          let valisasi_tujuanretur =
            header.jenis_fkr == "Peralihan MI" ? "MI" : header.tujuan_retur;
          let fkr_id = header.fkr_id;
          let sqlInsertHeaderFkr = `INSERT INTO fkr
          (fkr_id,isactive,createdby, nomor_fkr,eksekusi, m_distributor_id, tujuan_retur, status,kode_status,bulan,tahun,amount)
          VALUES('${header.fkr_id}','Y','${header.m_user_id}', '${nomor}', '${header.jenis_fkr}',
          '${header.m_distributor_id}', '${valisasi_tujuanretur}', 'Waiting ASM','DRAFT','${bulan}','${tahun}','${amount}')`;
          await request.query(sqlInsertHeaderFkr);

          for (let i = 0; i < details.length; i++) {
            let fkr_detail_id = uuid();
            let datasatuan = details[i].satuan.find((e) => e.ischoice == "Y");
            let kode_satuan = datasatuan.kode_satuan;

            let selItem = `SELECT * FROM m_produk WHERE kode_sap = '${details[i].kode_sap}'`;
            let dt = await request.query(selItem);
            let satuan = dt.recordset[0].satuan;
            dt = dt.recordset[0].m_produk_id;
            let sqlInsertDetailFkr = `INSERT INTO fkr_detail
            (fkr_detail_id, createdby, fkr_id, m_produk_id,satuan,
            total_retur,keterangan,amount_item)
            VALUES ('${fkr_detail_id}','${header.m_user_id}','${fkr_id}','${dt}','${kode_satuan}',${details[i].jumlah_retur},'${details[i].alasan}',${details[i].nett})`;

            console.log(sqlInsertDetailFkr);
            await request.query(sqlInsertDetailFkr);
          }
          let execSP = `exec sp_tambahline_fkr '${r_org}'`;
          //console.log(execSP);
          await request.query(execSP);

          return res.success({
            error: "false",
            result: null,
            message: "Success ",
          });
        }
      } catch (err) {
        console.log(err);
      }
    }
  },

  saveFKRnew: async function (req, res) {
    const { header, details } = req.body;

    console.log("Ke FKR NEWWWWW");

    console.log(req.body);

    if (
      header.jenis_fkr == "Peralihan Distributor" &&
      header.tujuan_retur == "MI"
    ) {
      return res.error({
        error: "true",
        result: null,
        message:
          "Distributor tujuan retur kosong harap isi distributor tujuan retur",
      });
    } else {
      await DB.poolConnect;
      try {
        const request = DB.pool.request();
        let DTB_query = `SELECT *,convert(varchar(10),getdate(),120) as today FROM m_distributor_v 
                           WHERE m_distributor_id = '${header.m_distributor_id}'`;
        let data_dtb = await request.query(DTB_query);
        data_dtb = data_dtb.recordset;
        let r_org = data_dtb[0].r_organisasi_id;
        let kode_shipto = data_dtb[0].kode;
        let today = data_dtb[0].today;
        let bulan = moment(today, "YYYY-MM-DD").format("MM");
        let tahun = moment(today, "YYYY-MM-DD").format("YYYY");
        let nomor = await generateNoFKR(r_org, kode_shipto, today);
        let amount = 0;
        for (let i = 0; i < details.length; i++) {
          amount = amount + details[i].nett;
        }
        if (nomor == "0") {
          return res.error({
            error: "true",
            result: null,
            message: "Gagal mendapatkan Nomor FKR ....",
          });
        } else {
          let errorValidation = [];
          for (let i = 0; i < details.length; i++) {
            let datasatuan = details[i].satuan.find((e) => e.ischoice == "Y");

            console.log(datasatuan);

            if (!datasatuan) {
              errorValidation.push(
                "Kode Satuan Kosong Pastikan Kode Satuan Terisi"
              );
            }
          }

          _.uniq(errorValidation);

          if (errorValidation.length > 0) {
            return res.error({
              message: errorValidation.toString(),
            });
          } else {
            let valisasi_tujuanretur =
              header.jenis_fkr == "Peralihan MI" ? "MI" : header.tujuan_retur;
            let fkr_id = header.fkr_id;
            let sqlInsertHeaderFkr = `INSERT INTO fkr
              (fkr_id,isactive,createdby, nomor_fkr,eksekusi, m_distributor_id, tujuan_retur, status,kode_status,bulan,tahun,amount)
              VALUES('${header.fkr_id}','Y','${header.m_user_id}', '${nomor}', '${header.jenis_fkr}',
              '${header.m_distributor_id}', '${valisasi_tujuanretur}', 'Waiting ASM','DRAFT','${bulan}','${tahun}','${amount}')`;
            await request.query(sqlInsertHeaderFkr);

            for (let i = 0; i < details.length; i++) {
              let fkr_detail_id = uuid();
              let datasatuan = details[i].satuan.find((e) => e.ischoice == "Y");
              let kode_satuan = datasatuan.kode_satuan;

              let selItem = `SELECT * FROM m_produk WHERE kode_sap = '${details[i].kode_sap}'`;
              let dt = await request.query(selItem);
              let satuan = dt.recordset[0].satuan;
              dt = dt.recordset[0].m_produk_id;
              let sqlInsertDetailFkr = `INSERT INTO fkr_detail
                (fkr_detail_id, createdby, fkr_id, m_produk_id,satuan,
                total_retur,keterangan,amount_item)
                VALUES ('${fkr_detail_id}','${header.m_user_id}','${fkr_id}','${dt}','${kode_satuan}',${details[i].jumlah_retur},'${details[i].alasan}',${details[i].nett})`;

              console.log(sqlInsertDetailFkr);
              await request.query(sqlInsertDetailFkr);
            }

            if (header.filename4) {
              let updateDocument = `UPDATE fkr SET doc_dtb4 = '${header.filename4}'
                  WHERE fkr_id = '${header.fkr_id}'`;

              console.log(updateDocument);
              await request.query(updateDocument);
            }

            let execSP = `exec sp_tambahline_fkr '${r_org}'`;
            //console.log(execSP);
            await request.query(execSP);

            return res.success({
              error: "false",
              result: null,
              message: "Success ",
            });
          }
        }
      } catch (err) {
        console.log(err);
      }
    }
  },
  editdokfkr: async function (req, res) {
    const { fkr_id, filename, file, m_user_id } = req.body;
    let uploadFile = req.file("image");

    let fkr_id_v = JSON.parse(fkr_id);
    let filename_v = JSON.parse(filename);

    console.log("edit do fkr", fkr_id_v, filename_v);
    await DB.poolConnect;
    try {
      const request = DB.pool.request();
      let sel = `SELECT * FROM fkr WHERE fkr_id = '${fkr_id_v}'`;
      // console.log(sel);
      let dssel = await request.query(sel);
      let jenisfkr = dssel.recordset[0].eksekusi;
      let sts = dssel.recordset[0].kode_status;
      let dokname = ``;
      if (sts == "WT2") {
        dokname = dssel.recordset[0].doc_ba;
        if (dokname == filename_v) {
          console.log("sama");
          return res.success({
            error: "true",
            result: null,
            message: "nama dokumen harus beda dari yang sebelumnya",
          });
        }

        let query1 = `update fkr set doc_ba = '${filename_v}' WHERE fkr_id = '${fkr_id_v}'`;
        await uploadFiles(fkr_id_v, uploadFile);
        await request.query(query1);
      } else if (sts == "WT6") {
        dokname = dssel.recordset[0].doc_dtb2;
        if (dokname == filename_v) {
          console.log("sama");
          return res.success({
            error: "true",
            result: null,
            message: "nama dokumen harus beda dari yang sebelumnya",
          });
        }

        let query1 = `UPDATE fkr set dok_do = '${filename_v}' WHERE fkr_id = '${fkr_id_v}'`;
        await uploadFilesKembali(fkr_id_v, uploadFile, "fkr_do");
        await request.query(query1);
      } else if (sts == "WT9") {
        dokname = dssel.recordset[0].dok_cn;
        if (dokname == filename_v) {
          console.log("sama");
          return res.success({
            error: "true",
            result: null,
            message: "nama dokumen harus beda dari yang sebelumnya",
          });
        }

        let query1 = `update fkr set dok_cn = '${filename_v}' WHERE fkr_id = '${fkr_id_v}'`;
        await uploadFilesKembali(fkr_id_v, uploadFile, "fkr_CN");
        await request.query(query1);
      }
      // console.log(jenisfkr,sts);

      return res.success({
        error: "false",
        result: null,
        message: "Berhasil Re-Upload dokument",
      });
    } catch (err) {
      return res.success({
        error: "true",
        result: null,
        message: "Gagal ....",
      });
    }
  },
  pushBAP: async function (req, res) {
    const { fkr_id, filename, m_user_id } = req.body;
    let uploadFile = req.file("image");

    let fkr_id_v = JSON.parse(fkr_id);
    let filename_v = JSON.parse(filename);
    let m_user_id_v = JSON.parse(m_user_id);
    

    // console.log("pushbapxxx", fkr_id_v, filename_v);

    await DB.poolConnect;
    try {
      const request = DB.pool.request();
      let sel = `SELECT * FROM fkr WHERE fkr_id = '${fkr_id_v}'`;
      // console.log(sel);
      let dssel = await request.query(sel);
      let jenisfkr = dssel.recordset[0].eksekusi;
      let nomor_so = dssel.recordset[0].nomor_so;
      let sts = ``;
      // console.log(jenisfkr, nomor_so);


      if(jenisfkr == 'Over Stock' || jenisfkr == 'Product Recall / Delisting' || jenisfkr == 'Peralihan MI' || jenisfkr == 'Peralihan MI' || jenisfkr == 'Pemusnahan Lokal' || jenisfkr == 'Pemusnahan Lokal'){
        sts = 'Waiting Penarikan Barang';
      }else{
        sts = 'Menunggu Proses Serah terima produk';
      }

      let query1 = `UPDATE fkr SET isconfirm_dtb = 'N',doc_ba = '${filename_v}',isconfirm_logistik = 'Y',
      kode_status = 'WT2', status = '${sts}' WHERE fkr_id = '${fkr_id_v}'`;

      // console.log(query1);
      let insert = `INSERT INTO fkr_audit_new (fkr_id,m_user_id,rolename,kode_status,status,created) VALUES 
                    ('${fkr_id_v}','${m_user_id_v}','FKRLOGISTIK','WT2','Logistik Upload BA',getdate())`;

      await request.query(query1);
      await request.query(insert);
      await uploadFiles(fkr_id_v, uploadFile);

      let UpdateNotifikasi = `UPDATE notifikasi_fkr SET isactive = 0 WHERE fkr_id = '${fkr_id_v}' AND kode_status = 'WT2'`;
      await request.query(UpdateNotifikasi);

      try {
        await kirimEmail(fkr_id_v, sts, request);
        let lemparan2 = buatxml2(nomor_so, sts);
        lemparFTP(lemparan2, fkr_id_v);
      } catch (error) {
        console.log(error);
      }
      return res.success({
        message: "Berhasil Upload Dokumen BA",
      });
    } catch (err) {
      return res.error({
        message: "Gagal Upload Dokumen BA",
      });
    }
  },
  pushfile: async function (req, res) {
    const { fkr_id, m_user_id } = req.body;
    let id = ``;
    try {
      id = JSON.parse(fkr_id);
    } catch (error) {
      id = fkr_id;
    }
    // let id = JSON.parse(fkr_id);
    let files = req.file("image1");
    let uploadFile2 = req.file("image2");
    let uploadFile3 = req.file("image3");
    try {
      let filenames = ``;
      var uploadFile = files;
      uploadFile.upload(
        { maxBytes: 500000000000 },
        await function onUploadComplete(err, files) {
          if (err) {
            let errMsg = err.message;
            console.log(errMsg);
            return res.error(errMsg);
          }
          console.log(id, "px");
          for (const file of files) {
            console.log("filename", file.filename);
            filenames = file.filename;
            fs.mkdirSync(dokumentPath("fkr_ba_kembali", id), {
              recursive: true,
            });
            const filesamaDir = glob.GlobSync(
              path.resolve(
                dokumentPath("fkr_ba_kembali", id),
                file.filename.replace(/\.[^/.]+$/, "")
              ) + "*"
            );
            if (filesamaDir.found.length > 0) {
              console.log("isexist file nama sama", filesamaDir.found[0]);
              fs.unlinkSync(filesamaDir.found[0]);
            }
            fs.renameSync(
              file.fd,
              path.resolve(dokumentPath("fkr_ba_kembali", id), file.filename)
            );
          }
          console.log("asdas");
        }
      );

      // file ke 2
      uploadFile2.upload(
        { maxBytes: 500000000000 },
        await function onUploadComplete(err, uploadFile2) {
          if (err) {
            let errMsg = err.message;
            console.log(errMsg);
            return res.error(errMsg);
          }
          console.log(id, "px");
          for (const file of uploadFile2) {
            console.log("filename", file.filename);
            filenames = file.filename;
            fs.mkdirSync(dokumentPath("fkr_ba_kembali", id), {
              recursive: true,
            });
            const filesamaDir = glob.GlobSync(
              path.resolve(
                dokumentPath("fkr_ba_kembali", id),
                file.filename.replace(/\.[^/.]+$/, "")
              ) + "*"
            );
            if (filesamaDir.found.length > 0) {
              console.log("isexist file nama sama", filesamaDir.found[0]);
              fs.unlinkSync(filesamaDir.found[0]);
            }
            fs.renameSync(
              file.fd,
              path.resolve(dokumentPath("fkr_ba_kembali", id), file.filename)
            );
          }
          console.log("asdas");
        }
      );

      // file ke 3
      uploadFile3.upload(
        { maxBytes: 500000000000 },
        await function onUploadComplete(err, uploadFile3) {
          if (err) {
            let errMsg = err.message;
            console.log(errMsg);
            return res.error(errMsg);
          }
          console.log(id, "px");
          for (const file of uploadFile3) {
            console.log("filename", file.filename);
            filenames = file.filename;
            fs.mkdirSync(dokumentPath("fkr_ba_kembali", id), {
              recursive: true,
            });
            const filesamaDir = glob.GlobSync(
              path.resolve(
                dokumentPath("fkr_ba_kembali", id),
                file.filename.replace(/\.[^/.]+$/, "")
              ) + "*"
            );
            if (filesamaDir.found.length > 0) {
              console.log("isexist file nama sama", filesamaDir.found[0]);
              fs.unlinkSync(filesamaDir.found[0]);
            }
            fs.renameSync(
              file.fd,
              path.resolve(dokumentPath("fkr_ba_kembali", id), file.filename)
            );
          }
          console.log("asdas");
        }
      );
      return res.success({
        error: "false",
        result: null,
        message: "Berhasil Upload data",
      });
    } catch (error) {
      return res.error(error);
    }
  },

  pushBAPKembali: async function (req, res) {
    const { fkr_id, filename, m_user_id, filename2, filename3 } = req.body;


    console.log(req.body);
  
    let paramFkrId = fkr_id &&  JSON.parse(fkr_id) != '' ? JSON.parse(fkr_id) : null;
    let paramfilename1 = filename &&  JSON.parse(filename) != '' ? JSON.parse(filename) : null;
    let paramfilename2 = filename2 &&  JSON.parse(filename2) != '' ? JSON.parse(filename2) : null;
    let paramfilename3 = filename3 &&  JSON.parse(filename3) != '' ?  JSON.parse(filename3) : null;
    let paramUserId = m_user_id &&  JSON.parse(m_user_id) != '' ? JSON.parse(m_user_id) : null;




    await DB.poolConnect;
    try {


      let fkr_id_v = paramFkrId;
      let filename_v1 = paramfilename1;
      let filename_v2 = paramfilename2;
      let filename_v3 = paramfilename3;



      console.log('paramFkrId ',paramFkrId);
      console.log('paramfilename1 ',filename_v1);
      console.log('paramfilename2 ',filename_v2);
      console.log('paramfilename3 ',filename_v3);
      console.log('paramUserId ',paramUserId);

      let kode_region;
      let m_user_id_v = JSON.parse(m_user_id);

      const request = DB.pool.request();
      let cek2 = `SELECT a.*,kode_region FROM fkr a
      left join m_distributor_v b on a.m_distributor_id = b.m_distributor_id WHERE fkr_id = '${fkr_id_v}'`;
  

      let dscek = await request.query(cek2);
      let kode_status = dscek.recordset[0].kode_status;
      let jenisfkr = dscek.recordset[0].eksekusi;
      let last_status = dscek.recordset[0].last_status;
      let note_hold = dscek.recordset[0].hold_note;
      let nomor_so = dscek.recordset[0].nomor_so;
      let nomorso = dscek.recordset[0].nomor_so;


  

      if (last_status || kode_status == "WT0") {

        return res.error({
          message: note_hold,
        });

      }

      // jagain file .rar & .zip supaya gamasuk


      if (kode_status == "WT2" && (!filename_v1 || !filename_v2 || !filename_v3 )){

        console.log('KENA KESINI ');

        return res.error({
          message: "File tidak lengkap harap lengkapi ke 3 file",
        });

      }else if(kode_status == "WT2" && (filename_v1 || filename_v2 || filename_v3 )){


        let arrayFormatFile = ['PDF'];

        if (!arrayFormatFile.includes(filename_v1.split('.').pop().toLocaleUpperCase()) || 
            !arrayFormatFile.includes(filename_v2.split('.').pop().toLocaleUpperCase()) ||
            !arrayFormatFile.includes(filename_v3.split('.').pop().toLocaleUpperCase())){
            return res.error({
              message: 'File tidak boleh .rar atau .zip hanya boleh format PDF',
            });
        }
      }

      if (dscek.recordset[0].kode_status) {
          kode_region = dscek.recordset[0].kode_region;
      } else {

        return res.error({
          message: "Organisasi distributor tidak memiliki data kode region harap hubungi IT untuk konfirmasi data",
        });
      }

      let sqlGetRole = `SELECT * FROM m_user_role_v WHERE m_user_id='${m_user_id_v}'`;
      let datarole = await request.query(sqlGetRole);
      let rolename = datarole.recordset.length > 0 ? datarole.recordset[0].nama : null;

      if(!rolename){

        return res.error({
          message: "User tidak memiliki akses untuk melakukan upload harap hubungi IT untuk konfirmasi data",
        });
      
      }


      let sqlCheckStatusSebelumnya = `SELECT TOP 1 status FROM fkr_audit_new f WHERE f.fkr_id = '${fkr_id_v}' ORDER BY created DESC`;
      let checkStatusSebelumnya = await request.query(sqlCheckStatusSebelumnya);
      let statusSebelumnya = checkStatusSebelumnya.recordset.length > 0 ? checkStatusSebelumnya.recordset[0].status : null;

      let sts = ``;
      if (kode_status == "WT2") {

        if (jenisfkr === `Peralihan Distributor`) {
          sts = `Waiting Penerimaan DTB Baru dan Verifikasi Admin Sales (Team 1)`;
        } else if (jenisfkr === `Peralihan Stock`) {
          sts = `Waiting Verifikasi Admin Sales (Team 1) & Proses DO di Log`;
        } else {
          sts = `Waiting Verifikasi Admin Sales (Team 1)`;
        }

        let sqlUpdateDataFkr = `UPDATE fkr SET  isconfirm_dtb = 'Y', doc_dtb1 = '${filename_v1}',doc_dtb2 = '${filename_v2}',
        doc_dtb3 = '${filename_v3}',kode_status = 'WT3', status = '${sts}' WHERE fkr_id = '${fkr_id_v}'`;


        let insertAudit = `INSERT INTO fkr_audit_new (fkr_id,m_user_id,rolename,kode_status,status,created) VALUES 
        ('${fkr_id_v}','${m_user_id_v}','${rolename}','WT3','Distributor Upload BA Kembali',getdate())`;

        if(statusSebelumnya=='Reject ADM 3'){

          sqlUpdateDataFkr = `UPDATE fkr SET  isconfirm_dtb = 'Y', doc_dtb1 = '${filename_v1}',doc_dtb2 = '${filename_v2}',
          doc_dtb3 = '${filename_v3}',kode_status = 'WT5', status = 'Admin Sales (Team 3) Verifikasi & Upload List Item DO Retur' WHERE fkr_id = '${fkr_id_v}'`;

          insertAudit = `INSERT INTO fkr_audit_new (fkr_id,m_user_id,rolename,kode_status,status,created) VALUES 
          ('${fkr_id_v}','${m_user_id_v}','${rolename}','WT5','Admin Sales (Team 3) Verifikasi & Upload List Item DO Retur',getdate())`;

        }


        await request.query(sqlUpdateDataFkr);
        await request.query(insertAudit);


        // //kirim email ke sales....
        let sel = `SELECT * FROM m_role_sales 
        WHERE kode_region = '${kode_region}'`;
        // console.log(sel);
        let dsSel = await request.query(sel);
        let datas = dsSel.recordset;
        for (let i = 0; i < datas.length; i++) {
          let user = datas[i].m_user_id;
          let insertNotifikasi = `INSERT INTO notifikasi_fkr (fkr_id,m_user_id,kode_status,notif_desc)
            VALUES ('${fkr_id_v}','${user}','WT3','Menunggu Verifikasi BA')`;
          await request.query(insertNotifikasi);
          // console.log(insertNotifikasi);
        }


        let lemparan2 = buatxml2(nomor_so, sts);
        try {
          lemparFTP(lemparan2, fkr_id_v);

          return res.success({
            message: "Berhasil Upload",
          });

        } catch (error) {

          return res.error({
            message: "Gagal Upload File Karena Koneksi",
          });

        }
      } else if (kode_status == "WT5") {
        console.log("upload list do");
        let query1 = `UPDATE fkr SET kode_status = 'WT6', status = 'Waiting DTB upload NRP & APS' , dok_do = '${filename_v1}'
        WHERE fkr_id = '${fkr_id_v}'`;
        let insert = `INSERT INTO fkr_audit_new (fkr_id,m_user_id,rolename,kode_status,status,created) VALUES 
                    ('${fkr_id_v}','${m_user_id_v}','${rolename}','WT6','Sales Upload List DO',getdate())`;
        // console.log(query1,insert);
        await request.query(query1);
        await request.query(insert);

        let UpdateNotifikasi = `UPDATE notifikasi_fkr SET isactive = 0 WHERE fkr_id = '${fkr_id_v}' AND kode_status = 'WT5'`;
        await request.query(UpdateNotifikasi);

        let uploadFile = req.file("image");
        await uploadFilesKembali(fkr_id_v, uploadFile, "fkr_do");
        try {
          await kirimEmail(fkr_id_v, sts, request);
          let lemparan2 = buatxml2(nomorso, "Waiting DTB upload NRP & APS");
          lemparFTP(lemparan2, fkr_id_v);

          return res.success({
            message: "Berhasil Upload",
          });

        } catch (error) {
          console.log(error);

          return res.error({
            message: "Gagal Upload File Karena Koneksi Ke Server Terputus",
          });

        }
        // email ke DTB
      } else if (kode_status == "WT6") {
        let uploadFile = req.file("image");
        await uploadFilesKembali(fkr_id_v, uploadFile, "fkr_nrp_dtb");
        let query1 = `UPDATE fkr SET  kode_status = 'WT7', status = 'NRP & APS Sukses Upload' , doc_nrp_dtb = '${filename_v1}'
        WHERE fkr_id = '${fkr_id_v}'`;

        let insert = `INSERT INTO fkr_audit_new (fkr_id,m_user_id,rolename,kode_status,status,created) VALUES 
                    ('${fkr_id_v}','${m_user_id_v}','${rolename}','WT7','Distributor Upload NRP & APS',getdate())`;

        // console.log(query1, insert);
        await request.query(query1);
        await request.query(insert);

        let sel = `SELECT * FROM m_role_sales WHERE kode_region = '${kode_region}'`;
        let dsSel = await request.query(sel);
        let datas = dsSel.recordset;
        for (let i = 0; i < datas.length; i++) {
          let user = datas[i].m_user_id;
          let insertNotifikasi = `INSERT INTO notifikasi_fkr (fkr_id,m_user_id,kode_status,notif_desc)
            VALUES ('${fkr_id_v}','${user}','WT7','Waiting Verify NRP & APS')`;
          await request.query(insertNotifikasi);
        }


        try {
          let lemparan2 = buatxml2(nomorso, "NRP & APS Sukses Upload");
          lemparFTP(lemparan2, fkr_id_v);

          return res.success({
            message: "Berhasil Upload",
          });
          
        } catch (error) {

          return res.error({
            message: "Gagal Upload File Karena Koneksi Ke Server Terputus",
          });
          
        }

      
      } else if (kode_status == "WT8") {
        let uploadFile = req.file("image");
        let query1 = `UPDATE fkr SET kode_status = 'WT9', status = 'CN Sudah Terbentuk & Menunggu Pengiriman Doc Asli: NRP, APS' , dok_cn = '${filename_v1}'
        WHERE fkr_id = '${fkr_id_v}'`;

        let insert = `INSERT INTO fkr_audit_new (fkr_id,m_user_id,rolename,kode_status,status,created) VALUES 
                    ('${fkr_id_v}','${m_user_id_v}','${rolename}','WT9','Upload CN',getdate())`;

        let UpdateNotifikasi = `UPDATE notifikasi_fkr set isactive = 0 WHERE fkr_id = '${fkr_id_v}' AND kode_status = 'WT8'`;
        await request.query(UpdateNotifikasi);
        console.log(query1, insert);
        await request.query(query1);
        await request.query(insert);
        await uploadFilesKembali(fkr_id_v, uploadFile, "fkr_CN");
        try {
          let lemparan2 = buatxml2(
            nomorso,
            "CN Sudah Terbentuk & Menunggu Pengiriman Doc Asli: NRP, APS"
          );
          lemparFTP(lemparan2, fkr_id_v);
          return res.success({
            message: "Berhasil Upload Pembentukan CN",
          });

        } catch (error) {

          return res.error({
            message: "Gagal Upload File Karena Koneksi Ke Server Terputus",
          });

        }
      }

    } catch (err) {

      console.log(err);
      return res.error({
        message: "Gagal Upload File",
      });
    }
  },
  uploadIom: async function (req, res) {
    const { fkr_id, filename } = req.body;
    console.log("masuk sini uploadIom ", fkr_id, filename);
    await DB.poolConnect;
    try {
      const request = DB.pool.request();

      let uploadFile = req.file("image");
      console.log(fkr_id);
      console.log(uploadFile);
      let query1 = `UPDATE fkr SET doc_dtb4 = '${filename}'
        WHERE fkr_id = '${fkr_id}'`;
      await uploadFilesKembali(fkr_id, uploadFile, "fkr_iom");
      await request.query(query1);

      return res.success({
        message: "Berhasil Upload IOM",
      });
    } catch (err) {
      return res.error({
        message: "Gagal Upload IOM",
      });
    }
  },
  verifikasiBA: async function (req, res) {
    const { m_user_id, fkr_id, pesan, reject, nomor_resi } = req.body;
    console.log(pesan);
    await DB.poolConnect;
    try {
      const request = DB.pool.request();
      let cek2 = `SELECT a.*,kode_region FROM fkr a
      left join m_distributor_v b on a.m_distributor_id = b.m_distributor_id WHERE fkr_id = '${fkr_id}'`;
      let dscek = await request.query(cek2);
      let kode_status = dscek.recordset[0].kode_status;
      let kode_region = dscek.recordset[0].kode_region
        ? dscek.recordset[0].kode_region
        : "";
      let jenisfkr = dscek.recordset[0].eksekusi;
      let last_status = dscek.recordset[0].last_status;
      let note_hold = dscek.recordset[0].hold_note;
      let nomor_so = dscek.recordset[0].nomor_so;
      if (last_status || kode_status == "WT0") {
        return res.success({
          error: "true",
          result: null,
          message: note_hold,
        });
      }

      let sqlGetRole = `SELECT * FROM m_user_role_v murv WHERE m_user_id='${m_user_id}'`;
      //console.log(sqlGetRole);
      let datarole = await request.query(sqlGetRole);
      let rolename = datarole.recordset[0].nama;

      console.log(kode_status, rolename, pesan, jenisfkr, "===========");
      if (pesan == "CFBA" && jenisfkr == "Peralihan Distributor") {
        let query = `update fkr set confirm_ba_alihan = 'Y', status = 'Waiting Verifikasi Logistics MI' WHERE fkr_id = '${fkr_id}'`;
        let insert = `INSERT INTO fkr_audit_new (fkr_id,m_user_id,rolename,kode_status,status,created) VALUES 
                    ('${fkr_id}','${m_user_id}','${rolename}','WT4','Sales Confirm BA Penerimaan DTB Baru',getdate())`;

        // console.log(insert);
        await request.query(query);
        await request.query(insert);
        let lemparan2 = buatxml2(nomor_so, "Waiting Verifikasi Logistics MI");
        try {
          lemparFTP(lemparan2, fkr_id);
        } catch (error) {}
      }
      return res.success({
        message: "Berhasil Verifikasi",
      });
    } catch (err) {
      return res.error({
        message: 'Gagal Verifikasi'
      });
    }
  },
  verifikasiFKR: async function (req, res) {
    const { m_user_id, fkr_id, pesan, reject, nomor_resi } = req.body;

    console.log(m_user_id, fkr_id, pesan);

    await DB.poolConnect;
    try {
      const request = DB.pool.request();
      let cek2 = `SELECT a.*,kode_region FROM fkr a
      left join m_distributor_v b on a.m_distributor_id = b.m_distributor_id WHERE fkr_id = '${fkr_id}'`;
      let dscek = await request.query(cek2);
      let kode_status = dscek.recordset[0].kode_status;
      let kode_region = dscek.recordset[0].kode_region
        ? dscek.recordset[0].kode_region
        : "";
      let jenisfkr = dscek.recordset[0].eksekusi;
      let nomor_so = dscek.recordset[0].nomor_so;
      let sqlGetRole = `SELECT * FROM m_user_role_v murv WHERE m_user_id='${m_user_id}'`;
      //console.log(sqlGetRole);
      let datarole = await request.query(sqlGetRole);
      let rolename = datarole.recordset[0].nama;
      let m_role_id = datarole.recordset[0].m_role_id;

      console.log(kode_status, rolename, "===========");

      if (kode_status == "WT3") {
        console.log("masuk disini...", jenisfkr);

        if (jenisfkr === `Pemusnahan Lokal` || jenisfkr == `PEMUSNAHAN`) {
          console.log("prooo");
          let query = `exec sp_terimaGR_fkr_pemusnahan '${fkr_id}','${kode_region}'`;
          await request.query(query);

          let insert = `INSERT INTO fkr_audit_new (fkr_id,m_user_id,rolename,kode_status,status,created) VALUES 
                        ('${fkr_id}','${m_user_id}','${rolename}','WT5','Admin Sales (Team 3) Verifikasi & Upload List Item DO Retur',getdate())`;
          await request.query(insert);

          try {
            let lemparan2 = buatxml2(
              nomor_so,
              "Admin Sales (Team 3) Verifikasi & Upload List Item DO Retur"
            );
            lemparFTP(lemparan2, fkr_id);
          } catch (error) {}

          // return res.error("pxpxpxp");
        } else {
          let query1 = `update fkr set kode_status = 'WT4', status = 'Waiting Verifikasi Logistik MI', note_sales = '${pesan}' WHERE fkr_id = '${fkr_id}'`;

          let insert = `INSERT INTO fkr_audit_new (fkr_id,m_user_id,rolename,kode_status,status,created) VALUES 
                        ('${fkr_id}','${m_user_id}','${rolename}','WT4','Sales Verify BA',getdate())`;

          console.log(query1, insert);
          await request.query(query1);
          await request.query(insert);
          //kirim email ke logistik....
          let update1 = `update notifikasi_fkr set isactive = 0 WHERE fkr_id = '${fkr_id}' AND kode_status = 'WT3'`;
          await request.query(update1);

          try {
            let lemparan2 = buatxml2(
              nomor_so,
              "Waiting Verifikasi Logistics MI"
            );
            lemparFTP(lemparan2, fkr_id);
          } catch (error) {}
        }

        // let insertNotifikasi = `INSERT INTO notifikasi_fkr (fkr_id,m_user_id,kode_status,notif_desc)
        // VALUES ('${fkr_id_v}','${user}','WT4','Menunggu Verifikasi BA')`;
        // await request.query(insertNotifikasi)
      } else if (kode_status == "WT7") {
        if (reject) {
          let query1 = `update fkr set  kode_status = 'WT6', status = 'Waiting DTB upload NRP & APS' , dok_do = null
            WHERE fkr_id = '${fkr_id}'`;

          let insert = `INSERT INTO fkr_audit_new (fkr_id,m_user_id,rolename,kode_status,status,created) VALUES 
                        ('${fkr_id}','${m_user_id}','${rolename}','WT6','Reject NRP & APS',getdate())`;

          console.log(query1, insert);
          await request.query(query1);
          await request.query(insert);
          //kirim email ke distributor
          let update1 = `update notifikasi_fkr set isactive = 0 WHERE fkr_id = '${fkr_id}' AND kode_status = 'WT7'`;
          await request.query(update1);

          try {
            let lemparan2 = buatxml2(nomor_so, "Reject NRP & APS");
            lemparFTP(lemparan2, fkr_id);
          } catch (error) {}
        } else {
          console.log("sdfds");
          let query1 = `update fkr set  kode_status = 'WT8', status = 'Waiting CN' WHERE fkr_id = '${fkr_id}'`;

          let insert = `INSERT INTO fkr_audit_new (fkr_id,m_user_id,rolename,kode_status,status,created) VALUES 
                        ('${fkr_id}','${m_user_id}','${rolename}','WT8','Sales Verify NRP & APS',getdate())`;

          console.log(query1, insert);
          await request.query(query1);
          await request.query(insert);
          //kirim email ke Finance
          let update1 = `update notifikasi_fkr set isactive = 0 WHERE fkr_id = '${fkr_id}' AND kode_status = 'WT7'`;
          await request.query(update1);

          let selfinance = `SELECT * FROM m_user WHERE role_default_id = 'DED64A80-33F2-4DBA-85AA-47FFC16DD0FF'`;
          let ds = await request.query(selfinance);
          for (let i = 0; i < ds.recordset.length; i++) {
            let user = ds.recordset[i].m_user_id;
            let insertNotifikasi = `INSERT INTO notifikasi_fkr (fkr_id,m_user_id,kode_status,notif_desc)
              VALUES ('${fkr_id}','${user}','WT8','Menunggu CN')`;

            console.log(insertNotifikasi);
            await request.query(insertNotifikasi);
          }

          try {
            let lemparan2 = buatxml2(nomor_so, "Sales Verify NRP & APS");
            lemparFTP(lemparan2, fkr_id);
          } catch (error) {}
        }
      } else if (kode_status == "WT9") {
        if (nomor_resi) {
          let query1 = `update fkr set  nomor_resi = '${nomor_resi}' WHERE fkr_id = '${fkr_id}'`;
          await request.query(query1);

          let sel = `SELECT * FROM m_role_sales WHERE kode_region = '${kode_region}'`;
          let dsSel = await request.query(sel);
          let datas = dsSel.recordset;
          for (let i = 0; i < datas.length; i++) {
            let user = datas[i].m_user_id;
            let insertNotifikasi = `INSERT INTO notifikasi_fkr (fkr_id,m_user_id,kode_status,notif_desc)
                  VALUES ('${fkr_id}','${user}','WT9','Menunggu Dok Asli diterima')`;
            await request.query(insertNotifikasi);
          }

          try {
            let lemparan2 = buatxml2(nomor_so, "Menunggu Dok Asli diterima");
            lemparFTP(lemparan2, fkr_id);
          } catch (error) {}
        } else {
          let query1 = `update fkr set  kode_status = 'WT10', status = 'Waiting finance Confirm Document' WHERE fkr_id = '${fkr_id}'`;
          let insert = `INSERT INTO fkr_audit_new (fkr_id,m_user_id,rolename,kode_status,status,created) VALUES 
                          ('${fkr_id}','${m_user_id}','${rolename}','WT10','Dok NRP diterima Sales',getdate())`;

          let selfinance = `SELECT * FROM m_user WHERE role_default_id = 'DED64A80-33F2-4DBA-85AA-47FFC16DD0FF'`;
          let ds = await request.query(selfinance);
          for (let i = 0; i < ds.recordset.length; i++) {
            let user = ds.recordset[i].m_user_id;
            let insertNotifikasi = `INSERT INTO notifikasi_fkr (fkr_id,m_user_id,kode_status,notif_desc)
                  VALUES ('${fkr_id}','${user}','WT10','Konfirmasi Dokument Asli')`;

            console.log(insertNotifikasi);
            await request.query(insertNotifikasi);
          }
          await request.query(query1);
          await request.query(insert);

          try {
            let lemparan2 = buatxml2(
              nomor_so,
              "Waiting finance Confirm Document"
            );
            lemparFTP(lemparan2, fkr_id);
          } catch (error) {}
        }
      } else if (kode_status == "WT10") {
        let query1 = `update fkr set  kode_status = 'WT11', status = 'Doc Asli diterima Finance' WHERE fkr_id = '${fkr_id}'`;
        let insert = `INSERT INTO fkr_audit_new (fkr_id,m_user_id,rolename,kode_status,status,created) VALUES 
                  ('${fkr_id}','${m_user_id}','${rolename}','WT10','Finance menerima dok NRP & APS asli',getdate())`;
        let update1 = `update notifikasi_fkr set isactive = 0 WHERE fkr_id = '${fkr_id}' AND kode_status = 'WT10'`;

        let insertNotifikasi = `INSERT INTO notifikasi_fkr (fkr_id,m_user_id,kode_status,notif_desc)
                  VALUES ('${fkr_id}','${m_user_id}','WT11','Menunggu Pemotongan AR')`;

        console.log(insertNotifikasi);
        await request.query(insertNotifikasi);
        await request.query(update1);
        await request.query(query1);
        await request.query(insert);

        try {
          let lemparan2 = buatxml2(
            nomor_so,
            "Finance menerima dok NRP & APS asli"
          );
          lemparFTP(lemparan2, fkr_id);
        } catch (error) {}
      } else if (kode_status == "WT11") {
        let query1 = `update fkr set  kode_status = 'WT12', status = 'Complete' WHERE fkr_id = '${fkr_id}'`;
        let insert = `INSERT INTO fkr_audit_new (fkr_id,m_user_id,rolename,kode_status,status,created) VALUES 
                  ('${fkr_id}','${m_user_id}','${rolename}','WT12','Complete',getdate())`;
        let update1 = `update notifikasi_fkr set isactive = 0 WHERE fkr_id = '${fkr_id}' AND kode_status = 'WT11'`;
        await request.query(update1);
        await request.query(query1);
        await request.query(insert);
        try {
          let lemparan2 = buatxml2(nomor_so, "Complete");
          lemparFTP(lemparan2, fkr_id);
        } catch (error) {}
      } else if (kode_status == "PS1") {
        let query1 = `update fkr set  kode_status = 'PS2', status = 'Doc Asli diterima Sales PT MI ' WHERE fkr_id = '${fkr_id}'`;
        let insert = `INSERT INTO fkr_audit_new (fkr_id,m_user_id,rolename,kode_status,status,created) VALUES 
                  ('${fkr_id}','${m_user_id}','${rolename}','PS2','Doc Asli diterima Sales PT MI',getdate())`;

        let sqlinsertAudit = `INSERT INTO fkr_audit_approve
        (createdby,updatedby,fkr_id, m_role_id, actions, kode_status)
        VALUES('${m_user_id}', '${m_user_id}', '${fkr_id}', '${m_role_id}', 'RECEIPT', 'PS2')`;

        await request.query(sqlinsertAudit);
        await request.query(query1);
        await request.query(insert);
      } else if (kode_status == "PS2") {
        let query2 = `update fkr set  kode_status = 'PS3', status = 'Doc Asli diterima Finance PT MI ' WHERE fkr_id = '${fkr_id}'`;
        let insert = `INSERT INTO fkr_audit_new (fkr_id,m_user_id,rolename,kode_status,status,created) VALUES 
                  ('${fkr_id}','${m_user_id}','${rolename}','PS2','Doc Asli diterima Finance PT MI',getdate())`;

        let sqlinsertAudit = `INSERT INTO fkr_audit_approve
        (createdby,updatedby,fkr_id, m_role_id, actions, kode_status)
        VALUES('${m_user_id}', '${m_user_id}', '${fkr_id}', '${m_role_id}', 'TERIMA', 'PS3')`;

        await request.query(sqlinsertAudit);
        await request.query(query2);
        await request.query(insert);
      } else if (kode_status == "PS3") {
        let query1 = `update fkr set  kode_status = 'WT12', status = 'Complete' WHERE fkr_id = '${fkr_id}'`;
        let insert = `INSERT INTO fkr_audit_new (fkr_id,m_user_id,rolename,kode_status,status,created) VALUES 
                  ('${fkr_id}','${m_user_id}','${rolename}','WT12','Complete',getdate())`;
        let update1 = `update notifikasi_fkr set isactive = 0 WHERE fkr_id = '${fkr_id}' AND kode_status = 'WT11'`;
        await request.query(update1);
        await request.query(query1);
        await request.query(insert);
        try {
          let lemparan2 = buatxml2(nomor_so, "Complete");
          lemparFTP(lemparan2, fkr_id);
        } catch (error) {}
      }

      return res.success({
        message: "Berhasil Verifikasi",
      });
    } catch (err) {
      return res.error({
        message: "Gagal Verifikasi",
      });
    }
  },
  approveFKR: async function (req, res) {
    const { m_user_id, fkr_id, reason, tgl_penarikan } = req.body;
    await DB.poolConnect;
    //  console.log("test",reason);
    console.log("m_user_id ", m_user_id);

    console.log("APPROVE YA");
    try {
      const request = DB.pool.request();
      console.log("CONNECTING");

      let sqlGetRole = `SELECT * FROM m_user_role_v_new WHERE m_user_id='${m_user_id}'`;
      console.log(sqlGetRole, "get role");
      let datarole = await request.query(sqlGetRole);
      let roleAcess = datarole.recordset;
      let rolename = datarole.recordset[0].nama;
      console.log(rolename, "role");

      let ceknomor_so = `SELECT * FROM fkr WHERE fkr_id = '${fkr_id}'`;
      let dataso = await request.query(ceknomor_so);
      let nomorso = dataso.recordset[0].nomor_fkr;
      let kodestatusExisting = dataso.recordset[0].kode_status;

      let objectRoleAccessId = null;
      let roleAccessId = null;

      console.log('kodestatusExisting ',kodestatusExisting);
      if (checkRole(roleAcess, ["SALESHO1"])) {
        rolename = "SALESHO1";
        objectRoleAccessId = roleAcess.find((e) => e.nama == "SALESHO1");
      } else if (checkRole(roleAcess, ["SALESHO2"])) {
        rolename = "SALESHO2";
        objectRoleAccessId = roleAcess.find((e) => e.nama == "SALESHO2");
      } else if (checkRole(roleAcess, ["SALESHO3"])) {
        rolename = "SALESHO3";
        objectRoleAccessId = roleAcess.find((e) => e.nama == "SALESHO3");
      } else if (
        checkRole(roleAcess, ["ASDH"]) &&
        (kodestatusExisting == "WAITINGSO" || kodestatusExisting == "DRAFT")
      ) {
        rolename = "ASDH";
        objectRoleAccessId = roleAcess.find((e) => e.nama == "ASDH");
      } else if (
        checkRole(roleAcess, ["RSDH"]) &&
        kodestatusExisting == "APA"
      ) {
        rolename = "RSDH";
        console.log("rolename ", rolename);
        objectRoleAccessId = roleAcess.find((e) => e.nama == "RSDH");
        console.log(objectRoleAccessId);
      } else if (checkRole(roleAcess, ["LOGISTIK"])) {
        rolename = "LOGISTIK";
        objectRoleAccessId = roleAcess.find((e) => e.nama == "LOGISTIK");
      } else if (checkRole(roleAcess, ["FKR LOGISTIK"])) {
        rolename = "FKR LOGISTIK";
        objectRoleAccessId = roleAcess.find((e) => e.nama == "FKR LOGISTIK");
      } else if (checkRole(roleAcess, ["ACCOUNTING"])) {
        rolename = "ACCOUNTING";
        objectRoleAccessId = roleAcess.find((e) => e.nama == "ACCOUNTING");
      }

      if (objectRoleAccessId) {
        roleAccessId = objectRoleAccessId.m_role_id;
        console.log(roleAccessId, "role akses");
      }

      let m_role_id = roleAccessId;
      console.log("rolename ", rolename);
      console.log("m_role_id ", m_role_id);

      //cek satuan terbesar
      let change = `update a set a.satuan = c.satuan
      FROM fkr_detail a 
      inner join m_produk b on a.m_produk_id = b.m_produk_id
      inner join r_satuan_terbesar c on c.kode_sap = b.kode_sap
      WHERE fkr_id = '${fkr_id}'
      AND a.satuan <> c.satuan`;
      await request.query(change);
      console.log(change);

      let status = ``;
      let kodestatus = ``;
      let namastatusaudit = ``;
      let kodestatusaudit = ``;


      if (
        rolename == "ASDH" &&
        (kodestatusExisting == "WAITINGSO" || kodestatusExisting == "DRAFT")
      ) {
        status = `, status = 'Waiting RSM'`;
        kodestatus = `, kode_status = 'APA'`;
        namastatusaudit = "Waiting RSM";
        kodestatusaudit = "APA";
      } else if (rolename == "RSDH" && kodestatusExisting == "APA") {
        status = `, status = 'Waiting Sales Head'`;
        kodestatus = `, kode_status = 'APR'`;
        namastatusaudit = "Waiting Sales Head";
        kodestatusaudit = "APR";
      } else if (rolename == "LOGISTIK") {
        status = `, status = 'Approved'`;
        kodestatus = `, kode_status = 'APL'`;
        namastatusaudit = "Approved";
        kodestatusaudit = "APL";
      } else if (rolename == "ACCOUNTING") {
        status = `, status = 'Approved'`;
        kodestatus = `, kode_status = 'APF'`;
        namastatusaudit = "Approved";
        kodestatusaudit = "APF";
      } else if (rolename == "SALESHO1") {
        status = `, status = 'Approved Sales'`;
        kodestatus = `, kode_status = 'APS3'`;
        namastatusaudit = "Approved Sales";
        kodestatusaudit = "APS3";
      } else if (rolename == "SALESHO2") {
        status = `, status = 'Approved Sales'`;
        kodestatus = `, kode_status = 'APS2'`;
        namastatusaudit = "Approved Sales";
        kodestatusaudit = "APS2";
      } else if (rolename == "SALESHO3") {
        status = `, status = 'Approved Sales'`;
        kodestatus = `, kode_status = 'APS1'`;
        namastatusaudit = "Approved Sales";
        kodestatusaudit = "APS1";
      } else {

        // CEK APAKAH DI AMANAHKAN SEBAGAI SALES HEAD

        let sqlCheckDataSalesHead = `SELECT COUNT(1) AS jumlahData FROM sales_head WHERE m_user_id = '${m_user_id}'`;
        let dataSalesHead = await request.query(sqlCheckDataSalesHead);
        let jumlahData = dataSalesHead.recordset[0].jumlahData;

        if(jumlahData > 0){

          m_role_id = !m_role_id ? m_user_id : m_role_id; 

          status = `, status = 'Approved Sales'`;
          kodestatus = `, kode_status = 'APS1'`;
          namastatusaudit = "Approved Sales";
          kodestatusaudit = "APS1";
          rolename = 'SALESHO3';

        }else{

          return res.error({
            message : 'ROLE TIDAK DAPAT MELAKUKAN APPROVE'
          });
        
        }
      }

      console.log("rolenamess ", rolename);
      if (
        checkRole(roleAcess, ["ASDH"]) &&
        (kodestatusExisting == "WAITINGSO" || kodestatusExisting == "DRAFT")
      ) {
        let sel = `SELECT * FROM fkr WHERE fkr_id = '${fkr_id}'`;
        console.log(sel);
        let dssel = await request.query(sel);
        let jenisfkr = dssel.recordset[0].eksekusi;

        if (jenisfkr === `Peralihan Stock`) {
          console.log("MASUK ALIHAN STOCK !! ");
          let cektgl = `SELECT DATEADD(day, 2, created),convert(varchar(8),DATEADD(day, 2, created),112)days
          FROM fkr WHERE fkr_id = '${fkr_id}'
          AND convert(varchar(10),DATEADD(day, 2, created),120) <= '${tgl_penarikan}'`;

          console.log("cektgl :", cektgl);
          let dstgl = await request.query(cektgl);
          if (dstgl.recordset.length == 0) {
            return res.error(
              "Minimal tgl Penarikan adalah 2 Hari dari pengajuan"
            );
          }
          // return res.error("Sukses....");

          let sql = `UPDATE fkr SET updated=getdate(),
          updatedby = '${m_user_id}', tgl_penarikan = '${tgl_penarikan}',
          status = '${namastatusaudit}' ${kodestatus}
          WHERE fkr_id='${fkr_id}'`;
          //console.log('kodestatus');
          request.query(sql, async (err) => {
            if (err) {
              return res.error(err);
            }

            let sqlinsertAudit = `INSERT INTO fkr_audit_approve
            (createdby,updatedby,fkr_id, m_role_id, actions, kode_status,note)
            VALUES('${m_user_id}', '${m_user_id}', '${fkr_id}', '${m_role_id}', 'APPROVE', '${kodestatusaudit}','${reason}')`;
            await request.query(sqlinsertAudit);

            let sqlgetfkr = `SELECT * FROM fkr_to_sap_v WHERE fkr_id='${fkr_id}'`;
            let datafkr = await request.query(sqlgetfkr);
            const rows = datafkr.recordset;
            let lemparan = buatxml2(nomorso, "Waiting Approval RSM");

            // console.log(lemparan);
            try {
              nomorso ? lemparFTP(lemparan, nomorso) : null;
              // let responeSoap =  await callSoapApprove(lemparan);
              // let {body, statusCode } = responeSoap;
              // console.log(statusCode);
            } catch (error) {}
            return res.success({
              result: rows,
              message: "Approve FKR successfully",
            });
          });
        } else {
          let cektgl = `SELECT DATEADD(day, 14, created),convert(varchar(8),DATEADD(day, 14, created),112)days
          FROM fkr WHERE fkr_id = '${fkr_id}'
          AND convert(varchar(10),DATEADD(day, 14, created),120) <= '${tgl_penarikan}'`;

          console.log(cektgl);
          let dstgl = await request.query(cektgl);
          if (tgl_penarikan && dstgl.recordset.length == 0) {
            return res.error({
              message: "Minimal tgl Penarikan adalah 14 Hari dari pengajuan",
            });
          }
          // return res.error("Sukses....");

          let sql = `UPDATE fkr SET updated=getdate(),
          updatedby = '${m_user_id}', tgl_penarikan = '${tgl_penarikan}',
          status = '${namastatusaudit}' ${kodestatus}
          WHERE fkr_id='${fkr_id}'`;
          //console.log('kodestatus');
          request.query(sql, async (err) => {
            if (err) {
              return res.error(err);
            }

            let sqlinsertAudit = `INSERT INTO fkr_audit_approve
            (createdby,updatedby,fkr_id, m_role_id, actions, kode_status,note)
            VALUES('${m_user_id}', '${m_user_id}', '${fkr_id}', '${m_role_id}', 'APPROVE', '${kodestatusaudit}','${reason}')`;
            await request.query(sqlinsertAudit);

            let sqlgetfkr = `SELECT * FROM fkr_to_sap_v WHERE fkr_id='${fkr_id}'`;
            let datafkr = await request.query(sqlgetfkr);
            const rows = datafkr.recordset;
            let lemparan = buatxml2(nomorso, "Waiting Approval RSM");

            // console.log(lemparan);
            try {
              nomorso ? lemparFTP(lemparan, nomorso) : null;
              // let responeSoap =  await callSoapApprove(lemparan);
              // let {body, statusCode } = responeSoap;
              // console.log(statusCode);
            } catch (error) {}
            return res.success({
              result: rows,
              message: "Approve FKR successfully",
            });
          });
        }
      } else if (
        checkRole(roleAcess, ["RSDH"]) &&
        kodestatusExisting == "APA"
      ) {
        let sql = `UPDATE fkr SET updated=getdate(),
        updatedby = '${m_user_id}',
        status = '${namastatusaudit}' ${kodestatus}
        WHERE fkr_id='${fkr_id}'`;
        console.log(sql);
        request.query(sql, async (err) => {
          if (err) {
            return res.error(err);
          }

          let sqlinsertAudit = `INSERT INTO fkr_audit_approve
          (createdby,updatedby,fkr_id, m_role_id, actions, kode_status,note)
          VALUES('${m_user_id}', '${m_user_id}', '${fkr_id}', '${m_role_id}', 'APPROVE', '${kodestatusaudit}','${reason}')`;
          console.log(sqlinsertAudit);
          await request.query(sqlinsertAudit);

          let sqlgetfkr = `SELECT * FROM fkr_to_sap_v WHERE fkr_id='${fkr_id}'`;
          let datafkr = await request.query(sqlgetfkr);
          const rows = datafkr.recordset;
          console.log(sqlgetfkr);

          let lemparan = buatxml2(nomorso, "Waiting Approval Channel Head");
          try {
            nomorso ? lemparFTP(lemparan, nomorso) : null;
            // let responeSoap =  await callSoapApprove(lemparan);
            // let {body, statusCode } = responeSoap;
            // console.log(statusCode);
          } catch (error) {}

          return res.success({
            result: rows,
            message: "Approve FKR successfully",
          });
        });
      } else if (
        rolename == "SALESHO1" ||
        rolename == "SALESHO2" ||
        rolename == "SALESHO3"
      ) {
        let roleOK = "";
        if (rolename == "SALESHO1") {
          roleOK = "CEO";
        } else if (rolename == "SALESHO2") {
          roleOK = "COO";
        } else if (rolename == "SALESHO3") {
          roleOK = "CSMO";
        }
        console.log(rolename);

        let sqlgetnominal = `SELECT nomor_fkr,amount,nomor_so,kode_status,eksekusi FROM fkr WHERE fkr_id = '${fkr_id}'`;
        let datanominal = await request.query(sqlgetnominal);
        let nominal_approve = datanominal.recordset[0].amount;
        let so_exsist = datanominal.recordset[0].nomor_so;
        let nomor_fkr = datanominal.recordset[0].nomor_fkr;
        let so_jenis = datanominal.recordset[0].eksekusi;
        console.log("NOMINALLL", sqlgetnominal, datanominal, nominal_approve);

        let kodestatus_ = datanominal.recordset[0].kode_status;
        console.log(kodestatus);

        if (kodestatus_ == "APA" || kodestatus_ == "DRAFT") {
          return res.error("Approval Tidak bisa dilakukan !");
        }

        let topapprovement = ``;
        let dataTopApprovement = ``;
        if (nominal_approve >= 0) {
          let slgetTopApprovement = `SELECT mr.nama
          FROM fkr_role_amount_approve fraa
          LEFT JOIN m_role mr ON(mr.m_role_id = fraa.m_role_id)
          WHERE fraa.amount <= ${nominal_approve} 
          ORDER BY fraa.amount DESC`;

          dataTopApprovement = await request.query(slgetTopApprovement);
          topapprovement = dataTopApprovement.recordset[0].nama;
        }

        if (topapprovement == rolename) {
          console.log("xoxoxoxoxoxox");
          let sqlgetstatusIntegasi = `SELECT TOP 1 * FROM integration_url ORDER BY created DESC`;
          let datastatusIntegasi = await request.query(sqlgetstatusIntegasi);
          let statusIntegasi =
            datastatusIntegasi.recordset.length > 0
              ? datastatusIntegasi.recordset[0].status
              : "DEV";

          let url = ``;
          let usernamesoap = sails.config.globals.usernamesoap;
          let passwordsoap = sails.config.globals.passwordsoap;

          let queryDataTable = `SELECT * FROM fkr_to_sap_v ftsv WHERE fkr_id='${fkr_id}'`;
          console.log(queryDataTable);
          let datafkr = await request.query(queryDataTable);
          let rows = datafkr.recordset;

          let datas = [];
          let datas2 = [];
          for (let i = 0; i < rows.length; i++) {
            let btstnk = "";
            let kodesap = ``;
            let nomor_fkr = rows[i].nomor_fkr;
            // ZCR3	MI Return Over Stock
            // ZCR4	MI Product Recall
            // ZCR5	SO Peralihan ke MI
            // ZCR6	SO Peralihan ke DTB
            // ZCR7	SO Returnya ke DTB
            // ZC14	SO Alihannya ke DTB
            // console.log(rows[i].eksekusi);
            if (rows[i].eksekusi == "Over Stock") {
              btstnk = rows[i].keterangan;
              kodesap = "ZCR3";
            } else if (rows[i].eksekusi == "Product Recall") {
              btstnk = rows[i].keterangan;
              kodesap = "ZCR4";
            } else if (rows[i].eksekusi == "Peralihan MI") {
              btstnk = rows[i].keterangan;
              kodesap = "ZCR5";
            } else if (rows[i].eksekusi == "Peralihan Distributor") {
              btstnk = "Peralihan"; //rows[i].keterangan;
              kodesap = "ZCR6";
            } else if (rows[i].eksekusi == "Product Recall / Delisting") {
              btstnk = rows[i].keterangan;
              kodesap = "ZCR4";
            } else if (rows[i].eksekusi == "Peralihan Stock") {
              btstnk = rows[i].keterangan;
              kodesap = "ZCR8";
            }

            //console.log(nomor_fkr);
            datas.push({
              KUNNR: rows[i].sold_to,
              KUNNS: rows[i].ship_to,
              VTWEG: rows[i].kode_channel,
              SPART: rows[i].division,
              AUART: kodesap,
              BSARK: "",
              MATNR: rows[i].kode_material,
              VRKME: rows[i].satuan,
              ABRVW: "Z1",
              KWEMNG: rows[i].total_retur,
              BSTNK: btstnk,
              VTEXT: nomor_fkr,
            });
          }

          let xml = fs.readFileSync("soap/ZFM_WS_SOFKR.xml", "utf-8");
          let hasil = racikXML(xml, datas, "ITAB");
          console.log(hasil);

          let remotePath = ``;
          if (statusIntegasi == "DEV") {
            url =
              "http://sapdevene.enesis.com:8010/sap/bc/srt/rfc/sap/zws_sales_sofkr/120/zws_sales_sofkr/zbn_sales_sofkr"; // development
            remotePath =
              "/home/sapftp/esales/fkr/approval/requestdev/" +
              `${so_exsist}.xml`;
            usernamesoap = sails.config.globals.usernamesoapdev;
            passwordsoap = sails.config.globals.passwordsoapdev;
          } else {
            // url = 'http://sapdevene.enesis.com:8010/sap/bc/srt/rfc/sap/zws_sales_sofkr/120/zws_sales_sofkr/zbn_sales_sofkr';
            url =
              "http://sapprdene.enesis.com:8310/sap/bc/srt/rfc/sap/zws_sales_sofkr/300/zws_sales_sofkr/zbn_sales_sofkr"; // production
            remotePath =
              "/home/sapftp/esales/fkr/approval/request/" + `${so_exsist}.xml`;
            usernamesoap = sails.config.globals.usernamesoap;
            passwordsoap = sails.config.globals.passwordsoap;
          }
          // cek so exists
          if (so_exsist) {
            let datas = [so_exsist];
            let xml = fs.readFileSync("soap/REQUEST_SOAP.xml", "utf-8");
            let hasil = racikXMLObject2(xml, datas, "VBELN");
            console.log(hasil);
            try {
              //let remotePath = '/home/sapftp/esales/fkr/approval/request/'+`${so_exsist}.xml`;
              let locationFiles = dokumentPath(
                "fkrtemp",
                "requestApprove"
              ).replace(/\\/g, "/");
              let dst =
                dokumentPath("fkrtemp", "requestApprove") +
                "/" +
                `${so_exsist}.xml`;
              let localPath = dst.replace(/\\/g, "/");

              fs.writeFileSync(localPath, hasil);
              let filenames = fs.existsSync(localPath);
              if (filenames) {
                await sftp
                  .connect(ftpconfig)
                  .then(() => {
                    return sftp.fastPut(localPath, remotePath);
                  })
                  .then(() => {
                    sftp.end();
                  })
                  .catch((err) => {
                    console.error(err.message);
                  });
              }
            } catch (error) {
              console.log(error);
            }
            let sts = ``;
            let kdsts = ``;
            let isConDtb = ``;
            console.log("cccccccccccccc", so_jenis);
            if (so_jenis == "Peralihan Distributor") {
              sts = `Waiting BA Peralihan`;
              kdsts = `WT1`;
            } else if (
              so_jenis == "Pemusnahan Lokal" ||
              so_jenis == "PEMUSNAHAN"
            ) {
              sts = `Waiting BA Pemusnahan`;
              kdsts = `WT1`;
              isConDtb = `, isconfirm_dtb = 'N'`;
            } else if (so_jenis == "Peralihan Stock") {
              sts = `Menunggu Proses Serah terima barang`;
              kdsts = `WT2`;
            } else {
              sts = `Waiting BA Penarikan Barang`;
              kdsts = `WT1`;
            }
            let sql = `UPDATE fkr 
                SET updated=getdate(),
                kode_status = '${kdsts}', status = '${sts}',
                updatedby = '${m_user_id}',
                isconfirm_logistik = 'N' ${isConDtb}
                WHERE fkr_id='${fkr_id}'`;
            await request.query(sql);
            console.log("CEK QUERY WT2 >> ", sql);
            // FTP Status

            let lemparan2 = buatxml2(so_exsist, sts);
            try {
              lemparFTP(lemparan2, nomorso);
            } catch (error) {}

            let cekUser = `SELECT * FROM m_user WHERE role_default_id = '4f023218-a611-4ace-9466-238db3f5671f'`; //logistik
            let users = await request.query(cekUser);
            users = users.recordset;
            for (let i = 0; i < users.length; i++) {
              let user = users[i].m_user_id;
              insertNotifikasi = `INSERT INTO notifikasi_fkr (fkr_id,m_user_id,kode_status,notif_desc)
            VALUES ('${fkr_id}','${user}','WT2','Menunggu BA Logistik')`;
              await request.query(insertNotifikasi);
            }

            let sqlgetfkr = `SELECT * FROM fkr_to_sap_v WHERE fkr_id='${fkr_id}'`;
            let datafkr = await request.query(sqlgetfkr);
            let rows = datafkr.recordset;

            let sqlinsertAudit = `INSERT INTO fkr_audit_approve
        (createdby,updatedby,fkr_id, m_role_id, actions, kode_status,note)
        VALUES('${m_user_id}', '${m_user_id}', '${fkr_id}', '${m_role_id}', 'APPROVE', '${kodestatusaudit}','${reason}')`;
            await request.query(sqlinsertAudit);

            return res.success({
              result: rows,
              message: "Approve FKR successfully",
            });

            // return res.error(
            //   `Nomor So sudah ada....`
            //  );
          }
          // return res.error(
          //   `Cek...`
          //  );

          const tok = `${usernamesoap}:${passwordsoap}`;
          const hash = Base64.encode(tok);
          const Basic = "Basic " + hash;

          let headers = {
            Authorization: Basic,
            "user-agent": "esalesSystem",
            "Content-Type": "text/xml;charset=UTF-8",
            soapAction:
              "urn:sap-com:document:sap:rfc:functions:ZWS_SALES_SOFKR:ZFM_WS_SOFKRRequest",
          };

          console.log(" BBBB ", hasil);

          let { response } = await soapRequest({
            url: url,
            headers: headers,
            xml: hasil,
            timeout: 1000000,
          }); // Optional timeout parameter(milliseconds)
          let { body, statusCode } = response;
          // console.log('statusCode ',statusCode);
          let sqlgetdatafkr = `SELECT nomor_fkr as nomor_so,eksekusi FROM fkr WHERE fkr_id='${fkr_id}'`;
          let datafkr2 = await request.query(sqlgetdatafkr);
          let nomor_fkr =
            datafkr2.recordset.length > 0
              ? datafkr2.recordset[0].nomor_fkr
              : "";
          let eksekusi =
            datafkr2.recordset.length > 0 ? datafkr2.recordset[0].eksekusi : "";
          if (datafkr2.recordset.length > 0) {
            console.log(response.body, statusCode);
            // console.log("XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX");
            if (statusCode == 200) {
              console.log("disini...");
              var parser = new xml2js.Parser({ explicitArray: false });
              parser.parseString(body, async function (err, result) {
                if (err) {
                  return res.error(err);
                }

                const VALUE =
                  result["soap-env:Envelope"]["soap-env:Body"][
                    "n0:ZFM_WS_SOFKRResponse"
                  ].VALUE;
                const VBELN =
                  result["soap-env:Envelope"]["soap-env:Body"][
                    "n0:ZFM_WS_SOFKRResponse"
                  ].VBELN;
                let nilai_so = Number(VALUE) * 100;

                let setamount = `, amount = ${nilai_so}`;
                let setnomorso = `, nomor_so = ${VBELN}`;
                console.log("nomor_so ", setnomorso);

                console.log(VBELN, VALUE, "balikan SAP");
                // return res.error("OKE......")
                if (VBELN) {
                  console.log("VBELN >>>>>>>>> ");
                  if (rows[0].eksekusi == "Peralihan Distributor") {

                    let dtalihan = await request.query(`SELECT TOP 1 b.kode_pajak,
                    b.kode,b.nama,mp.kode_channel FROM fkr a 
                    inner join m_distributor_v b
                    on b.m_distributor_id = a.tujuan_retur 
                    inner join m_pajak mp
                    on mp.kode = b.kode_pajak 
                    WHERE a.fkr_id = '${fkr_id}'`);

                    dtalihan = dtalihan.recordset;
                    let soldTo = dtalihan[0].kode_pajak;
                    let shipTo = dtalihan[0].kode;
                    let kode_channel = dtalihan[0].kode_channel;
                    for (let i = 0; i < rows.length; i++) {
                      datas2.push({
                        KUNNR: soldTo,
                        KUNNS: shipTo,
                        VTWEG: kode_channel,
                        SPART: '00',
                        AUART: "ZC01",
                        BSARK: "",
                        MATNR: rows[i].kode_material,
                        VRKME: rows[i].satuan,
                        ABRVW: "",
                        KWEMNG: rows[i].total_retur,
                        BSTNK: VBELN,
                        VTEXT: nomor_fkr,
                      });
                    }
                    xml = fs.readFileSync("soap/ZFM_WS_SOALIHAN.xml", "utf-8");
                    let hasil2 = racikXML(xml, datas2, "ITAB");
                    console.log(hasil2);
                    let url2 = ``;

                    if (statusIntegasi == "DEV") {
                      // url2 = `http://sapdevene.enesis.com:8010/sap/bc/srt/rfc/sap/zws_sales_soalihan/120/zws_sales_soalihan/zbn_sales_soalihan`; // development
                      url2 = `http://sapdevene.enesis.com:8010/sap/bc/srt/rfc/sap/zws_sales_soalihan/120/zws_sales_soalihan/zws_sales_soalihan`; // development
                    } else {
                      url2 = `http://sapprdene.enesis.com:8310/sap/bc/srt/rfc/sap/zws_sales_soalihan/300/zws_sales_soalihan/zbn_sales_soalihan`; // production
                    }

                    let { response } = await soapRequest({
                      url: url2,
                      headers: headers,
                      xml: hasil2,
                      timeout: 1000000,
                    }); // Optional timeout parameter(milliseconds)
                    let { body, statusCode } = response;

                    console.log("statusCode ", response);
                    var parser = new xml2js.Parser({ explicitArray: false });
                    parser.parseString(body, async function (err, result) {
                      if (err) {
                        return res.error(err);
                      }
                      const VALUE =
                        result["soap-env:Envelope"]["soap-env:Body"][
                          "n0:ZFM_WS_SOALIHANResponse"
                        ].VALUE;
                      const VBELN =
                        result["soap-env:Envelope"]["soap-env:Body"][
                          "n0:ZFM_WS_SOALIHANResponse"
                        ].VBELN;
                      console.log(VBELN);
                      if (VBELN) {
                        await request.query(
                          `update fkr set nomor_so_alihan = '${VBELN}' WHERE fkr_id = '${fkr_id}'`
                        );
                      } else {
                        return res.error("Tidak dapat nomor SO Alihan...");
                      }
                    });
                    // return res.error("Tidak dapat nomor SO...")
                  }
                  // return res.error("Tidak dapat nomor SO2...")

                  if (rows[0].eksekusi == "Peralihan Stock") {
                    console.log("MASUK ALIHAN STOCK > ");

                    let dtalihan = await request.query(`SELECT TOP 1 b.kode_pajak,b.kode,
                    b.nama,mp.kode_channel FROM fkr a 
                    inner join m_distributor_v b
                    on b.m_distributor_id = a.tujuan_retur 
                    inner join m_pajak mp
                    on mp.kode = b.kode_pajak 
                    WHERE a.fkr_id = '${fkr_id}'`);
                    dtalihan = dtalihan.recordset;
                    let soldTo = dtalihan[0].kode_pajak;
                    let shipTo = dtalihan[0].kode;
                    let kode_channel = dtalihan[0].kode_channel;
                    console.log("CETAK 1 >> ");
                    for (let i = 0; i < rows.length; i++) {
                      datas2.push({
                        KUNNR: soldTo,
                        KUNNS: shipTo,
                        VTWEG: kode_channel,
                        SPART: '00',
                        AUART: "ZC14",
                        BSARK: "",
                        MATNR: rows[i].kode_material,
                        VRKME: rows[i].satuan,
                        ABRVW: "",
                        KWEMNG: rows[i].total_retur,
                        BSTNK: VBELN,
                        VTEXT: nomor_fkr,
                      });
                    }
                    xml = fs.readFileSync("soap/ZFM_WS_SOALIHAN.xml", "utf-8");
                    let hasil2 = racikXML(xml, datas2, "ITAB");
                    console.log("hasil2 >> ", hasil2);
                    let url2 = ``;

                    if (statusIntegasi == "DEV") {
                      url2 = `http://sapdevene.enesis.com:8010/sap/bc/srt/rfc/sap/zws_sales_soalihan/120/zws_sales_soalihan/zbn_sales_soalihan`; // development
                    } else {
                      url2 = `http://sapprdene.enesis.com:8310/sap/bc/srt/rfc/sap/zws_sales_soalihan/300/zws_sales_soalihan/zbn_sales_soalihan`; // production
                    }

                    let { response } = await soapRequest({
                      url: url2,
                      headers: headers,
                      xml: hasil2,
                      timeout: 1000000,
                    }); // Optional timeout parameter(milliseconds)
                    let { body, statusCode } = response;

                    console.log("statusCode ", response);
                    var parser = new xml2js.Parser({ explicitArray: false });
                    parser.parseString(body, async function (err, result) {
                      if (err) {
                        return res.error(err);
                      }
                      const VALUE =
                        result["soap-env:Envelope"]["soap-env:Body"][
                          "n0:ZFM_WS_SOALIHANResponse"
                        ].VALUE;
                      const VBELN =
                        result["soap-env:Envelope"]["soap-env:Body"][
                          "n0:ZFM_WS_SOALIHANResponse"
                        ].VBELN;
                      console.log(VBELN);
                      if (VBELN) {
                        await request.query(
                          `update fkr set nomor_so_alihan = '${VBELN}' WHERE fkr_id = '${fkr_id}'`
                        );
                      } else {
                        return res.error("Tidak dapat nomor SO Alihan...");
                      }
                    });
                    // return res.error("Tidak dapat nomor SO...")
                  }
                
                nilai_so = nilai_so ? nilai_so : 0;

                let sql = `UPDATE fkr 
                SET updated=getdate(),
                amount=${nilai_so},
                updatedby = '${m_user_id}'
                ${setnomorso}
                WHERE fkr_id='${fkr_id}'`;
                  await request.query(sql);
                } else {
                  console.log("ERROR KARNA GADAPET NOMOR SO ");
                  return res.error("Tidak dapat nomor SO...");
                }

                const PESAN = "Success Approve";
                //result['soap-env:Envelope']['soap-env:Body']['n0:ZFM_WS_APFKRResponse'].PESAN;
                let sqlgetnominal = `SELECT amount FROM fkr WHERE fkr_id = '${fkr_id}'`;
                let datanominal = await request.query(sqlgetnominal);
                let nominal_approve = datanominal.recordset[0].amount;

                let topapprovement = ``;
                if (nominal_approve >= 0) {
                  let slgetTopApprovement = `SELECT mr.nama
                FROM fkr_role_amount_approve fraa
                LEFT JOIN m_role mr ON(mr.m_role_id = fraa.m_role_id)
                WHERE fraa.amount <= ${nominal_approve} 
                ORDER BY fraa.amount DESC`;

                  let dataTopApprovement = await request.query(
                    slgetTopApprovement
                  );
                  topapprovement = dataTopApprovement.recordset[0].nama;
                }

                // retur 2021
                let statusapprove = `On Progress`;
                let isconfirm_logistik = ``;
                let insertNotifikasi = ``;
                let sts = ``;
                let kdStsNew = ``;
                let isConDtb = ``;
                if (topapprovement == rolename) {
                  isconfirm_logistik = `, isconfirm_logistik = 'N'`;

                  if (rows[0].eksekusi == "Peralihan Distributor") {
                    sts = `Waiting BA Peralihan`;
                    kdStsNew = `WT1`;
                  } else if (rows[0].eksekusi == "Peralihan Stock") {
                    sts = `Menunggu proses serah terima barang`;
                    kdStsNew = `WT2`;
                    isConDtb = ` , isconfirm_dtb = 'N'`;
                  } else {
                    sts = `Waiting BA Penarikan Barang`;
                    kdStsNew = `WT1`;
                  }
                  // statusapprove = PESAN;
                  statusapprove = sts;
                  kodestatus = `, kode_status = '${kdStsNew}'`;
                  if (eksekusi == "PEMUSNAHAN") {
                    statusapprove = "BAP Belum Diterima Logistik";
                  }

                  let cekUser = `SELECT * FROM m_user WHERE role_default_id = '4f023218-a611-4ace-9466-238db3f5671f'`; //logistik
                  let datas = await request.query(cekUser);
                  datas = datas.recordset;
                  for (let i = 0; i < datas.length; i++) {
                    let user = datas[i].m_user_id;
                    insertNotifikasi = `INSERT INTO notifikasi_fkr (fkr_id,m_user_id,kode_status,notif_desc)
                    VALUES ('${fkr_id}','${user}','WT2','Menunggu BA Logistik')`;
                    await request.query(insertNotifikasi);
                  }
                }

                let sql = `UPDATE fkr SET updated=getdate(),
              updatedby = '${m_user_id}',
              status = '${statusapprove}' ${kodestatus} ${isconfirm_logistik} ${isConDtb}
              WHERE fkr_id='${fkr_id}'`;

                console.log(sql, "***********");

                request.query(sql, async (err) => {
                  if (err) {
                    return res.error(err);
                  }

                  let sqlinsertAudit = `INSERT INTO fkr_audit_approve
                (createdby,updatedby,fkr_id, m_role_id, actions, kode_status,note)
                VALUES('${m_user_id}', '${m_user_id}', '${fkr_id}', '${m_role_id}', 'APPROVE', '${kodestatusaudit}','${reason}')`;
                  await request.query(sqlinsertAudit);

                  let sqlgetfkr = `SELECT * FROM fkr_to_sap_v WHERE fkr_id='${fkr_id}'`;
                  let datafkr = await request.query(sqlgetfkr);
                  const rows = datafkr.recordset;

                  let getdataemail = await request.query(
                    `SELECT email_verifikasi,role FROM email_klaim  WHERE role = 'LOGISTIK'`
                  );

                  let dataemail = [];
                  for (let i = 0; i < getdataemail.recordset.length; i++) {
                    dataemail.push(getdataemail.recordset[i].email_verifikasi);
                  }
                  // dataemail.push(['tiasadeputra@gmail.com']);
                  // dataemail.push(['ilyas.nurrahman74@gmail.com']);
                  if (dataemail.length > 0) {
                    let sqlParam = `SELECT fkr_id,nama_distributor,
                  CONCAT(DateName( month , DateAdd( month , bulan , 0 ) - 1 ),' - ',tahun) AS periode,
                  eksekusi,nomor_so FROM fkr_v  WHERE fkr_id = '${fkr_id}'`;
                    let getdataparam = await request.query(sqlParam);
                    let dataparam = getdataparam.recordset[0];

                    let queryDetail = `SELECT a.fkr_detail_id, 
                  a.isactive, a.created, a.createdby, 
                  a.updated, a.updatedby, a.fkr_id, a.m_produk_id,
                  COALESCE(rst.keterangan,a.satuan) AS satuan,
                  mp.kode AS kode_produk,
                  mp.kode_sap,
                  mp.nama AS nama_barang,
                  a.total_retur, 
                  a.expired_gudang, a.expired_toko, a.damage, a.recall, 
                  a.retur_administratif, a.rusak_di_jalan, a.misspart, a.peralihan,
                  a.repalcement, a.delisting, a.keterangan
                  FROM fkr_detail a
                  LEFT JOIN r_satuan_terkecil rst ON (a.satuan = rst.kode)
                  ,m_produk mp
                  WHERE a.fkr_id='${fkr_id}'
                  AND a.m_produk_id = mp.m_produk_id`;
                    let dataDetails = await request.query(queryDetail);
                    let details = dataDetails.recordset;
                    for (let i = 0; i < details.length; i++) {
                      details[i].nomor = i + 1;
                    }
                    let detailshtml = _generateDetailsApproveEmail(details);

                    const param = {
                      subject: "TELAH RILIS SO FKR " + dataparam.nomor_so,
                      distributor: dataparam.nama_distributor,
                      eksekusi: dataparam.eksekusi,
                      periode: dataparam.periode,
                      nomor_so: dataparam.nomor_so,
                      details: detailshtml,
                    };

                    const template = await sails.helpers.generateHtmlEmail.with(
                      { htmltemplate: "fkr_progress2", templateparam: param }
                    );

                    if (statusIntegasi == "DEV") {
                      let emaildev = [];
                      emaildev.push("tiasadeputra@gmail.com");
                      emaildev.push("ilyas.nurrahman@gmail.com");

                      SendEmail(emaildev.toString, param.subject, template);
                    } else {
                      SendEmail(dataemail.toString, param.subject, template);
                    }
                  }

                  try {
                    let px = `SELECT * FROM fkr WHERE fkr_id = '${fkr_id}'`;
                    let dtpx = await request.query(px);
                    dtpx = dtpx.recordset;

                    let lemparan2 = buatxml2(dtpx[0].nomor_so, sts);
                    lemparFTP(lemparan2, fkr_id);
                  } catch (error) {
                    console.log(error);
                  }

                  return res.success({
                    result: rows,
                    message: "Approve FKR successfully",
                  });
                });
              });
            } else {
              return res.error(
                `SAP tidak meresponse status response ${statusCode}`
              );
            }
          }
        } else {
          // kodestatus = `,kode_status = '${kodestatus}' `
          let sql = `UPDATE fkr SET updated=getdate(),
        updatedby = '${m_user_id}',
        status = 'On Progress' ${kodestatus}
        WHERE fkr_id='${fkr_id}'`;

          console.log("xxxpspspspsp", sql);

          request.query(sql, async (err) => {
            if (err) {
              return res.error(err);
            }

            let sqlinsertAudit = `INSERT INTO fkr_audit_approve
          (createdby,updatedby,fkr_id, m_role_id, actions, kode_status)
          VALUES('${m_user_id}', '${m_user_id}', '${fkr_id}', '${m_role_id}', 'APPROVE', '${kodestatusaudit}')`;
            await request.query(sqlinsertAudit);
            console.log(sqlinsertAudit);

            let sqlgetfkr = `SELECT * FROM fkr_to_sap_v WHERE fkr_id='${fkr_id}'`;
            let datafkr = await request.query(sqlgetfkr);
            const rows = datafkr.recordset;
            let dataemail = [];

            let slgetTopApprovement = `SELECT mr.nama
          FROM fkr_role_amount_approve fraa
          LEFT JOIN m_role mr ON(mr.m_role_id = fraa.m_role_id)
          WHERE fraa.amount <= ${nominal_approve} 
          ORDER BY fraa.amount DESC`;
            console.log("qwertyuiop ", slgetTopApprovement);

            let dataTopApprovement = await request.query(slgetTopApprovement);
            let dataarraypapprovement = dataTopApprovement.recordset;
            //topapprovement = dataTopApprovement.recordset[0].nama;
            let position = 0;
            let nextemail = ``;
            for (let i = 0; i < dataarraypapprovement.length; i++) {
              topapprovement = dataTopApprovement.recordset[i].nama;
              if (topapprovement == rolename) {
                position = i;
              }
            }
            let q = ``;
            // console.log('position ',position);
            // console.log('dataarraypapprovement.length ',dataarraypapprovement.length);
            if (position == 1 && dataarraypapprovement.length == 3) {
              //email ke dataTopApprovement.recordset[1].nama
              q = `SELECT kode_channel,email_verifikasi,role,m_user_id FROM email_klaim WHERE role = 'SALESHO1'`;
            } else if (position == 0 && dataarraypapprovement.length == 2) {
              //email ke dataTopApprovement.recordset[2].nama
              q = `SELECT kode_channel,email_verifikasi,role,m_user_id FROM email_klaim WHERE role = 'SALESHO1'`;
            } else if (position == 1 && dataarraypapprovement.length == 2) {
              //email ke dataTopApprovement.recordset[2].nama
              q = `SELECT kode_channel,email_verifikasi,role,m_user_id FROM email_klaim WHERE role = 'SALESHO2'`;
            } else if (position == 2 && dataarraypapprovement.length == 3) {
              //email ke dataTopApprovement.recordset[2].nama
              q = `SELECT kode_channel,email_verifikasi,role,m_user_id FROM email_klaim WHERE role = 'SALESHO2'`;
            } else if (position == 0 && dataarraypapprovement.length == 1) {
              q = `SELECT kode_channel,email_verifikasi,role,m_user_id FROM email_klaim WHERE role = 'SALESHO3'`;
            }

            console.log("q ", q);

            let emailfkr = await request.query(q);
            const rowz = emailfkr.recordset;
            let user_target = rowz.length > 0 ? rowz[0].m_user_id : null;
            if (rowz.length > 0) {
              for (let i = 0; i < rowz.length; i++) {
                dataemail.push(rowz[i].email_verifikasi);
              }
            }

            // dataemail.push("indra.suandi@enesis.com")

            let sqlParam = `SELECT fkr_id,nama_distributor,status,
          CONCAT(DateName( month , DateAdd( month , bulan , 0 ) - 1 ),' - ',tahun) AS periode,nomor_fkr
          eksekusi,nomor_so,amount FROM fkr_v  WHERE fkr_id = '${fkr_id}'`;
            let getdataparam = await request.query(sqlParam);
            let dataparam = getdataparam.recordset[0];
            let nomor_fkr = dataparam.nomor_fkr ? dataparam.nomor_fkr : "";

            let queryDetail = `SELECT a.fkr_detail_id, 
                  a.isactive, a.created, a.createdby, 
                  a.updated, a.updatedby, a.fkr_id, a.m_produk_id,
                  COALESCE(rst.keterangan,a.satuan) AS satuan,
                  mp.kode AS kode_produk,
                  mp.kode_sap,
                  mp.nama AS nama_barang,
                  a.total_retur, 
                  a.expired_gudang, a.expired_toko, a.damage, a.recall, 
                  a.retur_administratif, a.rusak_di_jalan, a.misspart, a.peralihan,
                  a.repalcement, a.delisting, a.keterangan
                  FROM fkr_detail a
                  LEFT JOIN r_satuan_terkecil rst ON (a.satuan = rst.kode)
                  ,m_produk mp
                  WHERE a.fkr_id='${fkr_id}'
                  AND a.m_produk_id = mp.m_produk_id`;
            let dataDetails = await request.query(queryDetail);
            let details = dataDetails.recordset;
            for (let i = 0; i < details.length; i++) {
              details[i].nomor = i + 1;
            }
            let detailshtml = _generateDetailsApproveEmail(details);

            const param = {
              subject: "NEED APPROVAL FKR " + nomor_fkr,
              distributor: dataparam.nama_distributor,
              eksekusi: dataparam.eksekusi,
              periode: dataparam.periode,
              nominal_so: numeral(dataparam.amount).format("0,0"),
              status: dataparam.status,
              details: detailshtml,
              linkapprove: `https://esales.enesis.com/api/fkr/approve?m_user_id=${user_target}&fkr_id=${fkr_id}`,
              linkreject: `https://esales.enesis.com/api/fkr/reject?m_user_id=${user_target}&fkr_id=${fkr_id}`,
            };

            if (user_target) {
              const template = await sails.helpers.generateHtmlEmail.with({
                htmltemplate: "fkr_progress2",
                templateparam: param,
              });

              let sqlgetstatusIntegasi = `SELECT TOP 1 * FROM integration_url ORDER BY created DESC`;
              let datastatusIntegasi = await request.query(
                sqlgetstatusIntegasi
              );
              let statusIntegasi =
                datastatusIntegasi.recordset.length > 0
                  ? datastatusIntegasi.recordset[0].status
                  : "DEV";

              if (statusIntegasi == "DEV") {
                let emaildev = [];
                emaildev.push("tiasadeputra@gmail.com");
                emaildev.push("ilyas.nurrahman@gmail.com");

                SendEmail(emaildev.toString, param.subject, template);
              } else {
                SendEmail(dataemail.toString, param.subject, template);
              }
            }

            let lemparan = buatxml(nomorso, "Waiting Approval " + roleOK);
            // console.log(lemparan);
            try {
              let responeSoap = await callSoapApprove(lemparan);
              // let {body, statusCode } = responeSoap;
              // console.log(statusCode);
            } catch (error) {}

            return res.success({
              result: rows,
              message: "Approve FKR successfully",
            });
          });
        }
      } else if (rolename == "FKR LOGISTIK") {
        console.log("Konfirmasi dokumen BAP");
        let sql_fkr = `SELECT b.nama_ship_to,a.nomor_so,a.nomor_fkr,a.r_distribution_channel_id,d.r_region_id 
        ,b.email_verifikasi as emailasdh ,c.email_verifikasi as emaildtb
        ,CONCAT(DateName( month , DateAdd( month , bulan , 0 ) - 1 ),' - ',tahun) AS periode
        FROM fkr_v a
        left join m_distributor_profile_v b on a.m_distributor_id = b.m_distributor_id
        AND b.rolename in ('ASDH','RSDH')
        left join email_distributor c on c.m_distributor_id = a.m_distributor_id
        AND tipe = 'FKR'
        left join r_region d on d.kode = b.kode_region
        WHERE a.fkr_id = '${fkr_id}'`;

        console.log(sql_fkr);
        let data_fkr = await request.query(sql_fkr);
        data_fkr = data_fkr.recordset;
        let channel;
        let m_distributor_id;
        let nama_shipto;
        let nomor_so;
        let nomor_fkr;
        let region_id;
        let priode;
        let dataemail = [];

        if (data_fkr.length > 0) {
          channel = data_fkr[0].r_distribution_channel_id;
          m_distributor_id = data_fkr[0].m_distributor_id;
          nama_shipto = data_fkr[0].nama_ship_to;
          nomor_so = data_fkr[0].nomor_so;
          nomor_fkr = data_fkr[0].nomor_fkr;
          region_id = data_fkr[0].r_region_id;
          periode = data_fkr[0].periode;
          for (let i = 0; i < data_fkr.length; i++) {
            if (data_fkr[i].emailasdh) {
              dataemail.push(data_fkr[i].emailasdh);
            }
            if (data_fkr[i].emaildtb) {
              dataemail.push(data_fkr[i].emaildtb);
            }
          }
        }

        let sql_email = `SELECT * FROM email_klaim WHERE (r_distribution_channel_id = '${channel}'
        AND r_region_id = '${region_id}' AND role = 'SALES')
        or role = 'LOGISTIK'`;

        console.log(sql_email);
        let data_email = await request.query(sql_email);
        data_email = data_email.recordset;
        if (data_email.length > 0) {
          for (let i = 0; i < data_email.length; i++) {
            dataemail.push(data_email[i].email_verifikasi);
          }
        }
        console.log(dataemail);

        const param = {
          subject: "DOKUMEN BAP PEMUSNAHAN " + nama_shipto + " TELAH DITERIMA",
          nomor_dokumen: nomor_fkr,
          periode: periode,
          nomor_so: nomor_so,
          distributor: nama_shipto,
        };

        const template = await sails.helpers.generateHtmlEmail.with({
          htmltemplate: "notice_bap_accepted",
          templateparam: param,
        });
        console.log(template);
        let sqlupdate = `update fkr set status = 'BAP Diterima Logistik' WHERE fkr_id = '${fkr_id}'`;
        request.query(sqlupdate, async (err) => {
          if (err) {
            return res.error(err);
          } else {
            let sqlgetstatusIntegasi = `SELECT TOP 1 * FROM integration_url ORDER BY created DESC`;
            let datastatusIntegasi = await request.query(sqlgetstatusIntegasi);
            let statusIntegasi =
              datastatusIntegasi.recordset.length > 0
                ? datastatusIntegasi.recordset[0].status
                : "DEV";

            if (statusIntegasi == "DEV") {
              let emaildev = [];
              emaildev.push("tiasadeputra@gmail.com");
              emaildev.push("ilyas.nurrahman@gmail.com");

              SendEmail(emaildev.toString, param.subject, template);
            } else {
              SendEmail(dataemail.toString, param.subject, template);
            }
            return res.success("Dokumen BAP telah diterima ....");
          }
        });

        //

        // let sqlgetstatusIntegasi = `SELECT TOP 1 * FROM integration_url ORDER BY created DESC`;
        // let datastatusIntegasi = await request.query(sqlgetstatusIntegasi);
        // let statusIntegasi = datastatusIntegasi.recordset.length > 0 ? datastatusIntegasi.recordset[0].status : 'DEV';

        // let url = ``;
        // if(statusIntegasi=='DEV'){

        //   url = 'http://sapdevene.enesis.com:8010/sap/bc/srt/rfc/sap/zws_sales_histfkr/120/zws_sales_histfkr/zbn_sales_histfkr'; // development

        // }else{

        //   url = 'http://sapprdene.enesis.com:8310/sap/bc/srt/rfc/sap/zws_sales_histfkr/300/zws_sales_histfkr/zbn_sales_histfkr'; // production

        // }

        // let usernamesoap = sails.config.globals.usernamesoap;
        // let passwordsoap = sails.config.globals.passwordsoap;
        // const tok = `${usernamesoap}:${passwordsoap}`;
        // const hash = Base64.encode(tok);
        // const Basic = 'Basic ' + hash;

        // let headers = {
        //   'Authorization':Basic,
        //   'user-agent': 'esalesSystem',
        //   'Content-Type': 'text/xml;charset=UTF-8',
        //   'soapAction': 'urn:sap-com:document:sap:rfc:functions:ZWS_SALES_SOFKR:ZFM_WS_SOFKRRequest',
        // };

        // let sqlgetdatafkr = `SELECT nomor_so FROM fkr WHERE fkr_id='${fkr_id}'`;
        // let datafkr = await request.query(sqlgetdatafkr);
        // let nomor_so = datafkr.recordset.length > 0 ? datafkr.recordset[0].nomor_so : '';

        // if(datafkr.recordset.length > 0 ){

        //   let datas = [nomor_so];
        //   let xml = fs.readFileSync('soap/ZFM_WS_FKRHIST.xml', 'utf-8');
        //   let hasil = racikXMLObject(xml, datas, 'VBELN');
        //   //console.log(hasil);

        //   let { response } = await soapRequest({ url: url, headers: headers,xml:hasil, timeout: 1000000 }); // Optional timeout parameter(milliseconds)
        //   let {body, statusCode } = response;
        //   if(statusCode==200){
        //     var parser = new xml2js.Parser({explicitArray : false});
        //     parser.parseString(body, async function (err, result) {
        //       if (err) {
        //         return res.error(err);
        //       }

        //       const DOGR = result['soap-env:Envelope']['soap-env:Body']['n0:ZFM_WS_FKRHISTResponse'].DOGR;

        //       if(DOGR){

        //         let sql = `UPDATE fkr SET updated=getdate(),
        //         updatedby = '${m_user_id}',
        //         nomor_gi = '${DOGR}' ${kodestatus}
        //         WHERE fkr_id='${fkr_id}'`;

        //         request.query(sql, async (err) => {
        //           if (err) {
        //             return res.error(err);
        //           }

        //           let sqlinsertAudit = `INSERT INTO fkr_audit_approve
        //           (createdby,updatedby,fkr_id, m_role_id, actions, kode_status)
        //           VALUES('${m_user_id}', '${m_user_id}', '${fkr_id}', '${m_role_id}', 'APPROVE', '${kodestatusaudit}')`;
        //           await request.query(sqlinsertAudit);

        //           let sqlgetfkr = `SELECT * FROM fkr_to_sap_v WHERE fkr_id='${fkr_id}'`;
        //           let datafkr = await request.query(sqlgetfkr);
        //           const rows = datafkr.recordset;

        //           return res.success({
        //             result: rows,
        //             message: `Nomor GR ${DOGR}`
        //           });
        //         });

        //       }else{

        //       }

        //     });
        //   }
        // }
      } else {
        let sqlgetstatusIntegasi = `SELECT TOP 1 * FROM integration_url ORDER BY created DESC`;
        let datastatusIntegasi = await request.query(sqlgetstatusIntegasi);
        let statusIntegasi =
          datastatusIntegasi.recordset.length > 0
            ? datastatusIntegasi.recordset[0].status
            : "DEV";

        let usernamesoap = sails.config.globals.usernamesoap;
        let passwordsoap = sails.config.globals.passwordsoap;

        let url = ``;
        if (statusIntegasi == "DEV") {
          url =
            "http://sapdevene.enesis.com:8010/sap/bc/srt/rfc/sap/zws_sales_histfkr/120/zws_sales_histfkr/zbn_sales_histfkr"; // development
          usernamesoap = sails.config.globals.usernamesoapdev;
          passwordsoap = sails.config.globals.passwordsoapdev;
        } else {
          url =
            "http://sapprdene.enesis.com:8310/sap/bc/srt/rfc/sap/zws_sales_histfkr/300/zws_sales_histfkr/zbn_sales_histfkr"; // production
          usernamesoap = sails.config.globals.usernamesoap;
          passwordsoap = sails.config.globals.passwordsoap;
        }

        // let usernamesoap = sails.config.globals.usernamesoap;
        // let passwordsoap = sails.config.globals.passwordsoap;
        const tok = `${usernamesoap}:${passwordsoap}`;
        const hash = Base64.encode(tok);
        const Basic = "Basic " + hash;

        let headers = {
          Authorization: Basic,
          "user-agent": "esalesSystem",
          "Content-Type": "text/xml;charset=UTF-8",
          soapAction:
            "urn:sap-com:document:sap:rfc:functions:ZWS_SALES_SOFKR:ZFM_WS_SOFKRRequest",
        };

        let sqlgetdatafkr = `SELECT nomor_so FROM fkr WHERE fkr_id='${fkr_id}'`;
        let datafkr = await request.query(sqlgetdatafkr);
        let nomor_so =
          datafkr.recordset.length > 0 ? datafkr.recordset[0].nomor_so : "";

        if (datafkr.recordset.length > 0) {
          let datas = [nomor_so];
          let xml = fs.readFileSync("soap/ZFM_WS_FKRHIST.xml", "utf-8");
          let hasil = racikXMLObject(xml, datas, "VBELN");
          //console.log(hasil);

          let { response } = await soapRequest({
            url: url,
            headers: headers,
            xml: hasil,
            timeout: 1000000,
          }); // Optional timeout parameter(milliseconds)
          let { body, statusCode } = response;
          if (statusCode == 200) {
            var parser = new xml2js.Parser({ explicitArray: false });
            parser.parseString(body, async function (err, result) {
              if (err) {
                return res.error(err);
              }

              const CN =
                result["soap-env:Envelope"]["soap-env:Body"][
                  "n0:ZFM_WS_FKRHISTResponse"
                ].CN;

              if (CN) {
                let sql = `UPDATE fkr SET updated=getdate(),
                updatedby = '${m_user_id}',
                nomor_cn = '${CN}' ${kodestatus}
                WHERE fkr_id='${fkr_id}'`;

                request.query(sql, async (err) => {
                  if (err) {
                    return res.error(err);
                  }

                  let sqlinsertAudit = `INSERT INTO fkr_audit_approve
                  (createdby,updatedby,fkr_id, m_role_id, actions, kode_status)
                  VALUES('${m_user_id}', '${m_user_id}', '${fkr_id}', '${m_role_id}', 'APPROVE', '${kodestatusaudit}')`;
                  await request.query(sqlinsertAudit);

                  let sqlgetfkr = `SELECT * FROM fkr_to_sap_v WHERE fkr_id='${fkr_id}'`;
                  let datafkr = await request.query(sqlgetfkr);
                  const rows = datafkr.recordset;

                  return res.success({
                    result: rows,
                    message: `Nomor CN ${CN}`,
                  });
                });
              } else {
                return res.error("Nomor CN Belum Tersedia");
              }
            });
          }
        }
      }
    } catch (err) {
      return res.error(err);
    }
  },

  pengiriman_dokument: async function (req, res) {
    const { m_user_id, fkr_id, nomor_resi, jasa_pengiriman, penerima } =
      req.body;

    try {
      console.log(m_user_id, fkr_id, nomor_resi, jasa_pengiriman, penerima);
      await DB.poolConnect;
      const request = DB.pool.request();

      let sel = `SELECT fkr_id,nomor_fkr,status,kode_status FROM fkr f WHERE fkr_id = '${fkr_id}'`;
      let res_sel = await request.query(sel);
      res_sel = res_sel.recordset[0];
      let kode_status = res_sel.kode_status;

      let sqlGetRole = `SELECT role_default_id FROM m_user mu WHERE m_user_id = '${m_user_id}'`;
      console.log(sqlGetRole);
      let datarole = await request.query(sqlGetRole);
      let m_role_id = datarole.recordset[0].role_default_id;

      if (kode_status == "WT9") {
        let upd = `UPDATE fkr set status = 'Dok Asli Dikirim dtb, Waiting Penerimaan PT MI' , kode_status = 'PS1',
        nomor_resi = '${nomor_resi}' , jasa_pengiriman = '${jasa_pengiriman}', nama_penerima = '${penerima}'
        WHERE fkr_id = '${fkr_id}'`;
        await request.query(upd);
        console.log("SUKSES UPDATE COY ");

        let sqlinsertAudit = `INSERT INTO fkr_audit_approve
        (createdby,updatedby,fkr_id, m_role_id, actions, kode_status)
        VALUES('${m_user_id}', '${m_user_id}', '${fkr_id}', '${m_role_id}', 'KIRIM DOKUMEN', 'PS1')`;
        await request.query(sqlinsertAudit);
        console.log("SUKSES INSERT AUDIT ");

        let insert = `INSERT INTO fkr_audit_new (fkr_id,m_user_id,rolename,kode_status,status,created) VALUES 
                  ('${fkr_id}','${m_user_id}','DISTRIBUTOR','PS1','Dok Asli Dikirim dtb, Waiting Penerimaan PT MI',getdate())`;
        await request.query(insert);
        console.log("SUKSES INSERT AUDIT KE 2 ");

        return res.success({
          message: "Update data successfully",
        });
      } else {
        console.log("DATA TIDAK VALID");
        return res.err({
          message: "Data Tidak Valid Periksa Kembali Status FKR anda ! ",
        });
      }
    } catch (error) {
      console.log(error);
      return res.error(error);
    }
  },

  help: async function (req, res) {
    // const {m_user_id} = req.body;
    const filesamaDir = glob.GlobSync(
      path.resolve(templatePath(), "KetentuanFKR.png")
    );
    var lastItemAkaFilename = path.basename(filesamaDir.found[0]);
    return res.download(filesamaDir.found[0], lastItemAkaFilename);
  },
  cetakFKR: async function (req, res) {
    const {
      query: { m_user_id },
    } = req;
    console.log(query);
    await DB.poolConnect;
    try {
      const request = DB.pool.request();

      let sqlGetRole = `SELECT nama FROM m_user_role_v murv WHERE m_user_id='${m_user_id}'`;
      let datarole = await request.query(sqlGetRole);
      let rolename = datarole.recordset[0].nama;
      console.log("masuk sini.. cetak");

      let queryDataTable = `SELECT a.fkr_id,
      a.isactive, a.created, 
      a.createdby, a.updated, a.updatedby, 
      a.nomor_fkr,a.nomor_so, 
      a.bulan, a.tahun,
      a.nomor_gi,a.nomor_cn, 
      a.m_distributor_id, 
      mdv.nama_pajak,
      mdv.nama AS nama_distributor,
      mdv.channel AS nama_channel,
      mdv.r_distribution_channel_id,
      mdv.kode,
      a.tujuan_retur, a.amount,
      a.kode_status,
      a.status,
      a.file_bast,
      CASE WHEN a.eksekusi = 'PENGEMBALIAN' THEN 'Reguler Fisik'
                            WHEN a.eksekusi = 'PEMUSNAHAN' THEN 'Pemusnahan Lokal'
                            WHEN a.eksekusi = 'PENGALIHAN' THEN 'Peralihan' END AS eksekusi
      FROM fkr a,m_distributor_v mdv
      WHERE fkr_id ='${req.param(
        "id"
      )}' AND a.m_distributor_id = mdv.m_distributor_id `;

      console.log(queryDataTable);
      request.query(queryDataTable, async (err, result) => {
        if (err) {
          return res.error(err);
        }
        const row = result.recordset[0];
        let url = "http://esales.enesis.com:8000/eprop/getsellindisti.php";
        let formData = {
          dist_id: row.kode,
          year: row.tahun,
          month: row.bulan,
        };

        const encodeForm = (data) => {
          return Object.keys(data)
            .map(
              (key) =>
                encodeURIComponent(key) + "=" + encodeURIComponent(data[key])
            )
            .join("&");
        };

        let datasellin = await axios.post(url, encodeForm(formData), {
          headers: {
            Accept: "application/json",
          },
        });
        console.log("MASUK SINI 2");
        // let datasellin =  null;

        let sell_in = datasellin.data.data ? Number(datasellin.data.data) : 0;
        let persentase_sell_in = sell_in > 0 ? row.amount / sell_in : 0;
        row.baseurl = direktoricetak();
        row.tanggal_fkr = moment(row.created, "YYYY-MM-DD").format(
          "YYYY-MM-DD"
        );
        row.logoo =
          "data:image/png;base64," +
          Buffer.FROM(
            base64_encode(
              path.resolve(
                sails.config.appPath,
                "assets",
                "report",
                "fkr",
                "assets",
                "log2.png"
              )
            )
          );
        row.nomor_gi = row.nomor_gi ? row.nomor_gi : "-";
        row.nomor_cn = row.nomor_cn ? row.nomor_cn : "-";

        let nilai_so = convertToRupiah(row.amount);
        let persentase = persentase_sell_in + "%";
        row.nilai_so = nilai_so;
        row.persentase = persentase;

        let fkr_id = row.fkr_id;
        let queryDetail = `SELECT a.fkr_detail_id, 
        a.isactive, a.created, a.createdby, 
        a.updated, a.updatedby, a.fkr_id, a.m_produk_id,
        COALESCE(rst.keterangan,a.satuan) AS satuan,
        mp.kode AS kode_produk,
        mp.kode_sap,
        mp.nama AS nama_barang,
        a.total_retur, 
        a.expired_gudang, a.expired_toko, a.damage, a.recall, 
        a.retur_administratif, a.rusak_di_jalan, a.misspart, a.peralihan,
        a.repalcement, a.delisting, a.keterangan
        FROM fkr_detail a
        LEFT JOIN r_satuan_terkecil rst ON (a.satuan = rst.kode)
        ,m_produk mp
        WHERE a.fkr_id='${fkr_id}'
        AND a.m_produk_id = mp.m_produk_id`;
        let dataDetails = await request.query(queryDetail);
        let details = dataDetails.recordset;
        for (let i = 0; i < details.length; i++) {
          details[i].nomor = i + 1;
        }
        console.log(queryDetail);

        let cekstatusAsdh = `
        SELECT COUNT(1) AS status 
        FROM fkr_audit_approve 
        WHERE fkr_id = '${fkr_id}' AND kode_status='APA'`;

        let datastatusasdh = await request.query(cekstatusAsdh);
        let statusASDH = datastatusasdh.recordset[0].status;

        let cekstatusRsdh = `
        SELECT COUNT(1) AS status 
        FROM fkr_audit_approve 
        WHERE fkr_id = '${fkr_id}' AND kode_status='APR'`;
        let datastatusrsdh = await request.query(cekstatusRsdh);
        let statusRSDH = datastatusrsdh.recordset[0].status;

        let dataprogress = [];

        let status_asdh = "Belum diproses";
        if (statusASDH > 0) {
          status_asdh = "Approve";
        }

        let status_rsdh = "Belum diproses";
        if (statusRSDH > 0) {
          status_rsdh = "Approve";
        }

        let user1 = `SELECT
        COALESCE(mu.m_user_id,mu2.m_user_id) AS m_user_id,COALESCE(mu.nama,mu2.nama) AS approval,rjo.nama AS roleposition,
        CASE WHEN faa.actions IS NULL THEN 'Belum diproses' ELSE 'Approve' END AS status
        FROM fkr_role_amount_approve fraa
        LEFT JOIN fkr_audit_approve faa ON (faa.m_role_id = fraa.m_role_id AND faa.fkr_id = '${fkr_id}' AND faa.isactive='Y')
        LEFT JOIN m_role mr ON(fraa.m_role_id = mr.m_role_id)
        LEFT JOIN r_jenis_organisasi rjo ON(rjo.r_jenis_organisasi_id = mr.r_jenis_organisasi_id)
        LEFT JOIN m_user mu ON(mu.role_default_id = mr.m_role_id AND mu.r_distribution_channel_id = '${row.r_distribution_channel_id}')
        LEFT JOIN m_user mu2 ON(mu2.username = rjo.nama)
        WHERE fraa.amount <= ${row.amount} ORDER BY fraa.amount DESC`;

        let getdatauser1 = await request.query(user1);
        let datauser1 = getdatauser1.recordset;

        if (row.amount > 0) {
          for (let i = 0; i < datauser1.length; i++) {
            datauser1[i].line = 1;
            dataprogress.push(datauser1[i]);
          }
        }

        let user2 = `SELECT TOP 1 m_user_id,'RSDH' AS approval,rolename AS roleposition, 
        '${status_rsdh}' AS status
        FROM m_distributor_profile_v  WHERE m_distributor_id='${row.m_distributor_id}' AND rolename='RSDH'`;

        let getdatauser2 = await request.query(user2);
        let datauser2 = getdatauser2.recordset;

        for (let i = 0; i < datauser2.length; i++) {
          datauser2[i].line = 2;
          dataprogress.push(datauser2[i]);
        }

        let user3 = `SELECT TOP 1 m_user_id,'ASDH' AS approval,rolename AS roleposition, 
        '${status_asdh}' AS status
        FROM m_distributor_profile_v  WHERE m_distributor_id='${row.m_distributor_id}' AND rolename='ASDH'`;

        let getdatauser3 = await request.query(user3);
        let datauser3 = getdatauser3.recordset;

        for (let i = 0; i < datauser3.length; i++) {
          datauser3[i].line = 3;
          dataprogress.push(datauser3[i]);
        }

        // for (let i = 0; i < dataprogress.length; i++) {

        //   dataprogress[i].line = i + 1;

        // }

        let html = _generateTable(details);
        let htmlprogress = _generateTableProgress(dataprogress);
        row.table = html;
        row.tableprogress = htmlprogress;
        const content = fs.readFileSync(
          path.resolve(direktoricetak(), "index.hbs"),
          "utf-8"
        );

        let template = handlebars.compile(content);
        let finalHtml = template(row);

        const browser = await puppeteer.launch({ headless: true });
        const page = await browser.newPage();
        await page.setContent(finalHtml);
        let cssFile = path.join(direktoricetak(), `index.css`);
        await page.addStyleTag({ path: cssFile });

        // eslint-disable-next-line no-undef
        let height = await page.evaluate(
          () => document.documentElement.offsetHeight
        );
        let width = await page.evaluate(
          () => document.documentElement.offsetWidth
        );
        const buffer = await page.pdf({
          // height: `${height+1}px`,
          // printBackground: true,
          format: "A4",
          printBackground: true,
          landscape: true,
        });
        await browser.close();
        res.contentType(`application/pdf`);
        res.send(buffer);
      });
    } catch (err) {
      return res.error(err);
    }
  },

  getTemplatefile: async function (req, res) {
    const filename = req.param("filename");
    //console.log('te', filename)
    // const filepath = dokumentPath(user, 'submitfaktur', record)+'/'+filename

    const filesamaDir = glob.GlobSync(
      path.resolve(templatePath(), filename + "*")
    );
    if (filesamaDir.found.length > 0) {
      //console.log(filesamaDir.found[0])

      // return res.send(filesamaDir.found[0]);
      // return res.success('OK');
      var lastItemAkaFilename = path.basename(filesamaDir.found[0]);
      return res.download(filesamaDir.found[0], lastItemAkaFilename);
    }
    return res.error("Failed, File Not Found");
  },
  exportExcel: async function (req, res) {
    const {
      query: {
        m_user_id,
        fkr_id,
        periode,
        periodeend,
        m_distributor_id,
        eksekusi,
        region_id,
      },
    } = req;

    console.log(req.query);
    console.log("*************export FKR 1xxx***********", periodeend);
    // return res.error(err);
    await DB.poolConnect;

    try {
      const request = DB.pool.request();
      let userroles = `SELECT * FROM m_user_role_v WHERE m_user_id = '${m_user_id}'`;
      let datauser = await request.query(userroles);
      let rolename = "";
      let kode_soldto = "";
      if (datauser.recordset.length > 0) {
        rolename = datauser.recordset[0].nama;
      }
      console.log(rolename);

      let whereRegion = ``;
      if (region_id) {
        whereRegion = ` AND kode_region = '${region_id}'`;
      }

      let whereclausefkrid = ``;
      if (fkr_id) {
        whereclausefkrid = `AND fkr_id = '${fkr_id}'`;
      }

      let whereclausemdistributorid = ``;
      if (m_distributor_id) {
        whereclausemdistributorid = `AND m_distributor_id = '${m_distributor_id}'`;
      }

      let whereclauseeksekusi = ``;
      if (eksekusi) {
        whereclauseeksekusi = `AND eksekusi = '${eksekusi}'`;
      }

      let whereSoldto = ``;
      if (rolename == "DISTRIBUTOR") {
        kode_soldto = datauser.recordset[0].username;
        whereSoldto = ` AND m_distributor_id in (SELECT m_distributor_id FROM m_distributor_profile_v WHERE  kode_sold_to = '${kode_soldto}' )`;
        console.log(whereSoldto);
      }

      // let queryDataTable = `SELECT * FROM fkr_export_excel_v WHERE 1=1 ${whereclausefkrid} ${whereclausemdistributorid} ${whereclauseeksekusi} ORDER BY created`;

      let whereclauseperiode = ``;
      if ((periode && !periodeend) || (!periode && periodeend)) {
        let bulan = parseInt(moment(periode, "YYYY-MM").format("MM"));
        let tahun = moment(periode, "YYYY-MM").format("YYYY");
        whereclauseperiode = `AND bulan = ${bulan} AND tahun = '${tahun}'`;
      }

      if (periode && periodeend) {
        whereclauseperiode = ` AND convert(varchar(7),created,112) between '${periode}' AND '${periodeend}'`;
      }

      let queryDataTable = `SELECT * FROM fkr_export_excel_v WHERE 1=1 ${whereRegion} ${whereSoldto} ${whereclausefkrid} ${whereclausemdistributorid} ${whereclauseeksekusi} ${whereclauseperiode} ORDER BY created`;

      console.log(queryDataTable);

      request.query(queryDataTable, (err, result) => {
        if (err) {
          return res.error(err);
        }

        const rows = result.recordset;

        let arraydetailsforexcel = [];
        for (let i = 0; i < rows.length; i++) {
          let obj = {
            CHANNEL: rows[i].channel,
            REGION: rows[i].region,
            "SOLD TO PARTY": rows[i].kode_pajak,
            "SOLD TO PARTY NAME": rows[i].nama_pajak,
            DISTRIBUTOR: rows[i].distributor,
            BULAN: rows[i].bulan,
            TAHUN: rows[i].tahun,
            "CREATE FKR": rows[i].created,
            "PERIODE FKR": rows[i].periode_pengajuan,
            "NOMOR FKR": rows[i].nomor_fkr,
            "NOMOR SO RETUR": rows[i].nomor_so,
            "NOMOR GI": rows[i].nomor_gi,
            "NOMOR CREDIT NOTED": rows[i].nomor_cn,
            "TUJUAN RETUR": rows[i].tujuan_retur,
            "SATUAN": rows[i].satuan,
            "NOMOR SO INVOICE": rows[i].nomor_so_alihan,
            AMOUNT: rows[i].amount,
            "KODE SAP": rows[i].kode_sap,
            "KODE MI": rows[i].kode,
            MATERIAL: rows[i].nama,
            "TOTAL RETUR": rows[i].total_retur,
            "ALASAN RETUR": rows[i].keterangan,
            "EXPIRED GUDANG": rows[i].expired_gudang,
            "EXPIRED TOKO": rows[i].expired_toko,
            DAMAGE: rows[i].damage,
            RECALL: rows[i].recall,
            "RETUR ADMINISTRATIF": rows[i].retur_administratif,
            "RUSAK DI JALAN": rows[i].rusak_di_jalan,
            MISSPART: rows[i].misspart,
            PERALIHAN: rows[i].peralihan,
            REPLACEMENT: rows[i].repalcement,
            DELISTING: rows[i].delisting,
            "JENIS EKSEKUSI": rows[i].eksekusi,
            "STATUS DOKUMEN": rows[i].status,
            KETERANGAN: rows[i].keterangan ? rows[i].keterangan : "-",
            "ALASAN REJECT": rows[i].alasan_reject,
            "TANGGAL REJECT": rows[i].tgl_reject,
            "TANGGAL LOGISTIK UPLOAD BA": rows[i].tgl_logistik_upload_ba,
            "TANGGAL DISTRIBUTOR UPLOAD BA KEMBALI":
              rows[i].tgl_distributor_upload_ba_kembali,
            "TANGGAL SALES VERIFY BA": rows[i].tgl_sales_verify_ba,
            "TANGGAL SALES UPLOAD LIST DO": rows[i].tgl_sales_upload_list_do,
            "TANGGAL DISTRIBUTOR UPLOAD NRP DAN APS":
              rows[i].tgl_distributor_upload_nrp_aps,
            "TANGGAL SALES VERIFY NRP DAN APS":
              rows[i].tgl_sales_verify_nrp_aps,
            "TANGGAL UPLOAD CN": rows[i].tgl_upload_cn,
            "TANGGAL DOK NRP DITERIMA SALES":
              rows[i].tgl_dok_nrp_diterima_Sales,
            "TANGGAL COMPLETE": rows[i].tgl_complete,
          };

          arraydetailsforexcel.push(obj);
        }

        if (arraydetailsforexcel.length > 0) {
          let tglfile = moment().format("DD-MMM-YYYY_HH_MM_SS");
          let namafile = "fkr_".concat(tglfile).concat(".xlsx");

          var hasilXls = json2xls(arraydetailsforexcel);
          res.setHeader("Content-Type", "application/vnd.openxmlformats");
          res.setHeader(
            "Content-Disposition",
            "attachment; filename=" + namafile
          );
          res.end(hasilXls, "binary");
        } else {
          return res.error({
            message: "Data tidak ada",
          });
        }
      });
    } catch (err) {
      return res.error(err);
    }
  },

  getexportExcel: async function (req, res) {
    req.socket.setTimeout(1000 * 3600);
    const {
      query: {
        m_user_id,
        fkr_id,
        periode,
        periodeend,
        m_distributor_id,
        eksekusi,
      },
    } = req;

    console.log(periodeend, "xxxx");
    //console.log(req.query);

    await DB.poolConnect;
    try {
      const request = DB.pool.request();

      let whereclausefkrid = ``;
      if (fkr_id) {
        whereclausefkrid = `AND fkr_id = '${fkr_id}'`;
      }

      let whereclausemdistributorid = ``;
      if (m_distributor_id) {
        whereclausemdistributorid = `AND m_distributor_id = '${m_distributor_id}'`;
      }

      let whereclauseeksekusi = ``;
      if (eksekusi) {
        whereclauseeksekusi = `AND eksekusi = '${eksekusi}'`;
      }

      let whereclauseperiode = ``;
      if (periode) {
        let bulan = parseInt(moment(periode, "YYYY-MM").format("MM"));
        let tahun = moment(periode, "YYYY-MM").format("YYYY");
        whereclauseperiode = `AND bulan = ${bulan} AND tahun = '${tahun}'`;
      }

      if (periode && periodeend) {
        whereclauseperiode = ` AND convert(varchar(7),created,112) between '${periode}' AND '${periodeend}'`;
      }

      let queryDataTable = `SELECT * FROM fkr_export_excel_v WHERE 1=1 ${whereclausefkrid} ${whereclausemdistributorid} ${whereclauseeksekusi} ${whereclauseperiode} ORDER BY created`;

      console.log(queryDataTable);

      request.query(queryDataTable, (err, result) => {
        if (err) {
          return res.error(err);
        }

        const rows = result.recordset;

        let arraydetailsforexcel = [];
        for (let i = 0; i < rows.length; i++) {
          let obj = {
            DISTRIBUTOR: rows[i].distributor,
            BULAN: rows[i].bulan,
            TAHUN: rows[i].tahun,
            NOMOR_FKR: rows[i].nomor_fkr,
            NOMOR_SO: rows[i].nomor_so,
            NOMOR_GI: rows[i].nomor_gi,
            NOMOR_CREDIT_NOTED: rows[i].nomor_cn,
            TUJUAN_RETUR: rows[i].tujuan_retur,
            AMOUNT: rows[i].amount,
            MATERIAL: rows[i].nama,
            TOTAL_RETUR: rows[i].total_retur,
            EXPIRED_GUDANG: rows[i].expired_gudang,
            EXPIRED_TOKO: rows[i].expired_toko,
            DAMAGE: rows[i].damage,
            RECALL: rows[i].recall,
            RETUR_ADMINISTRATIF: rows[i].retur_administratif,
            RUSAK_DI_JALAN: rows[i].rusak_di_jalan,
            MISSPART: rows[i].misspart,
            PERALIHAN: rows[i].peralihan,
            REPLACEMENT: rows[i].repalcement,
            DELISTING: rows[i].delisting,
            JENIS_EKSEKUSI: rows[i].eksekusi,
            KETERANGAN: rows[i].keterangan,
          };

          arraydetailsforexcel.push(obj);
        }

        return res.success({
          result: arraydetailsforexcel,
          message: "Fetch data successfully",
        });
      });
    } catch (err) {
      return res.error(err);
    }
  },

  loadGrCn: async function (req, res) {
    // const {m_user_id,m_driver_id,nama,tgl_lahir,nomor_ktp,nomor_sim,nomor_hp} = req.body;
    await DB.poolConnect;
    try {
      console.log("api call here.....");
      const request = DB.pool.request();
      let sqlgetdatafkr = `SELECT * FROM fkr 
      WHERE (nomor_gi IS NULL OR nomor_cn IS NULL) AND status='Success Approve' AND isactive='Y'`;

      request.query(sqlgetdatafkr, async (err, result) => {
        if (err) {
          return res.error(err);
        }

        let sqlgetstatusIntegasi = `SELECT TOP 1 * FROM integration_url ORDER BY created DESC`;
        let datastatusIntegasi = await request.query(sqlgetstatusIntegasi);
        let statusIntegasi =
          datastatusIntegasi.recordset.length > 0
            ? datastatusIntegasi.recordset[0].status
            : "DEV";

        let datafkr = result.recordset;
        for (let i = 0; i < datafkr.length; i++) {
          let usernamesoap = sails.config.globals.usernamesoap;
          let passwordsoap = sails.config.globals.passwordsoap;
          let url = ``;
          if (statusIntegasi == "DEV") {
            url =
              "http://sapdevene.enesis.com:8010/sap/bc/srt/rfc/sap/zws_sales_histfkr/120/zws_sales_histfkr/zbn_sales_histfkr"; // development
            usernamesoap = sails.config.globals.usernamesoapdev;
            passwordsoap = sails.config.globals.passwordsoapdev;
          } else {
            url =
              "http://sapprdene.enesis.com:8310/sap/bc/srt/rfc/sap/zws_sales_fkrhist/300/zws_sales_fkrhist/zbn_sales_fkrhist"; // production
            usernamesoap = sails.config.globals.usernamesoap;
            passwordsoap = sails.config.globals.passwordsoap;
          }

          const tok = `${usernamesoap}:${passwordsoap}`;
          const hash = Base64.encode(tok);
          const Basic = "Basic " + hash;

          let headers = {
            Authorization: Basic,
            "user-agent": "esalesSystem",
            "Content-Type": "text/xml;charset=UTF-8",
            soapAction:
              "urn:sap-com:document:sap:rfc:functions:ZWS_SALES_SOFKR:ZFM_WS_SOFKRRequest",
          };

          let nomor_so = datafkr[i].nomor_so;
          let fkr_id = datafkr[i].fkr_id;
          let datas = [nomor_so];
          let xml = fs.readFileSync("soap/ZFM_WS_FKRHIST.xml", "utf-8");
          let hasil = racikXMLObject(xml, datas, "VBELN");

          let { response } = await soapRequest({
            url: url,
            headers: headers,
            xml: hasil,
            timeout: 1000000,
          }); // Optional timeout parameter(milliseconds)
          let { body, statusCode } = response;
          if (statusCode == 200) {
            var parser = new xml2js.Parser({ explicitArray: false });
            parser.parseString(body, async function (err, result) {
              if (err) {
                return res.error(err);
              }

              const DOGR =
                result["soap-env:Envelope"]["soap-env:Body"][
                  "n0:ZFM_WS_FKRHISTResponse"
                ].DOGR;
              const CN =
                result["soap-env:Envelope"]["soap-env:Body"][
                  "n0:ZFM_WS_FKRHISTResponse"
                ].CN;

              // console.log('DOGR ',DOGR);
              // console.log('CN ',CN);

              if (DOGR) {
                let sql = `UPDATE fkr 
                  SET updated=getdate(),
                  nomor_gi = '${DOGR}'
                  WHERE fkr_id='${fkr_id}'`;
                await request.query(sql);
              }

              if (CN) {
                let sql = `UPDATE fkr 
                  SET updated=getdate(),
                  nomor_cn = '${CN}'
                  WHERE fkr_id='${fkr_id}'`;
                await request.query(sql);
              }
            });
          }
        }
        return res.success({
          message: "Update data successfully",
        });
      });
    } catch (err) {
      return res.error(err);
    }
  },
  refreshso: async function (req, res) {
    const { m_user_id, fkr_id } = req.body;
    await DB.poolConnect;
    try {
      const request = DB.pool.request();
      let sel = `SELECT * FROM fkr WHERE fkr_id = '${fkr_id}'`;
      let dssel = await request.query(sel);
      let nomor_so = dssel.recordset[0].nomor_so;
      await getnewSO(nomor_so, fkr_id);
      return res.success({
        error: "true",
        result: null,
        message: "Gagal..",
      });
    } catch (err) {
      return res.success({
        error: "true",
        result: null,
        message: "Gagal..",
      });
    }
  },
};

async function getnewSO(nomor_so, fkr_id) {
  await DB.poolConnect;
  const request = DB.pool.request();

  let sqlgetstatusIntegasi = `SELECT TOP 1 * FROM integration_url ORDER BY created DESC`;
  let datastatusIntegasi = await request.query(sqlgetstatusIntegasi);
  let statusIntegasi =
    datastatusIntegasi.recordset.length > 0
      ? datastatusIntegasi.recordset[0].status
      : "DEV";
  let usernamesoap = sails.config.globals.usernamesoap;
  let passwordsoap = sails.config.globals.passwordsoap;

  let url = ``;
  if (statusIntegasi == "DEV") {
    url = `http://sapdevene.enesis.com:8010/sap/bc/srt/rfc/sap/zws_sales_fkrchange/120/zws_sales_fkrchange/zbn_sales_fkrchange`; // development

    usernamesoap = sails.config.globals.usernamesoapdev;
    passwordsoap = sails.config.globals.passwordsoapdev;
  } else {
    url = `http://sapprdene.enesis.com:8310/sap/bc/srt/rfc/sap/zws_sales_fkrchange/300/zws_sales_fkrchange/zbn_sales_fkrchange`; // production

    usernamesoap = sails.config.globals.usernamesoap;
    passwordsoap = sails.config.globals.passwordsoap;
  }

  console.log("usernamesoap ", usernamesoap);
  console.log("passwordsoap ", passwordsoap);

  const tok = `${usernamesoap}:${passwordsoap}`;
  const hash = Base64.encode(tok);
  const Basic = "Basic " + hash;
  let headers = {
    Authorization: Basic,
    "user-agent": "esalesSystem",
    "Content-Type": "text/xml;charset=UTF-8",
    soapAction:
      "urn:sap-com:document:sap:rfc:functions:ZFM_WS_CHANGEFKR:ZFM_WS_CHANGEFKRRequest",
  };

  if (nomor_so) {
    let xml = fs.readFileSync("soap/ZFM_SALES_FKRCHANGE.xml", "utf-8");
    let hasil = racikXML2(xml, nomor_so, "VBELN");
    //console.log(hasil);
    let { response } = await soapRequest({
      url: url,
      headers: headers,
      xml: hasil,
      timeout: 1000000,
    }); // Optional timeout parameter(milliseconds)
    let { body, statusCode } = response;
    // console.log(body);

    console.log("statusCode ", statusCode);

    if (statusCode == 200) {
      var parser = new xml2js.Parser({ explicitArray: false });
      parser.parseString(body, async function (err, result) {
        if (err) {
          return err;
        }
        const list =
          result["soap-env:Envelope"]["soap-env:Body"][
            "n0:ZFM_WS_CHANGEFKRResponse"
          ].ITAB;
        //console.log(list.item);
        let data = list.item;

        if (data) {
          if (data.length > 0) {
            console.log("okokokoko.......");
            let cek = `SELECT * FROM fkr_detail WHERE fkr_id = '${fkr_id}' order by created`;
            //console.log(cek);
            let dscekproduk = await request.query(cek);
            let alasan = dscekproduk.recordset[0].keterangan;

            let del = `delete FROM fkr_detail WHERE fkr_id = '${fkr_id}' `;
            await request.query(del);
            let totalAmount = 0;
            for (i = 0; i < data.length; i++) {
              let kode_sap = data[i].MATNR;
              let qty = data[i].KWMENG;
              let amount = Number(data[i].NETWR);
              totalAmount = totalAmount + Number(amount);
              let satuan = data[i].VRKME;
              let cekKode = `SELECT * FROM m_produk WHERE kode_sap = '${kode_sap}'`;
              let dscek = await request.query(cekKode);
              let m_produk_id = dscek.recordset[0].m_produk_id;

              let insert = `INSERT INTO fkr_detail (fkr_id,m_produk_id,total_retur,satuan,amount_item,keterangan) VALUES 
                  ('${fkr_id}','${m_produk_id}','${qty}','${satuan}',${amount},'${alasan}')`;
              //console.log(insert)
              await request.query(insert);
            }

            //console.log(totalAmount);

            let update = `UPDATE fkr set amount=${totalAmount} WHERE fkr_id='${fkr_id}'`;
            await request.query(update);
          }
        }
      });
    }
  }
}

function racikXML(xmlTemplate, jsonArray, rootHead) {
  var builder = new xml2js.Builder({ headless: true, rootName: rootHead });
  const addTemplate = jsonArray.map((data) => {
    return { item: data };
  });
  const result = builder.buildObject(addTemplate);

  return xmlTemplate.replace("?", result);
}
function racikXML2(xmlTemplate, jsonArray, rootHead) {
  var builder = new xml2js.Builder({ headless: true, rootName: rootHead });
  const addTemplate = jsonArray;
  const result = builder.buildObject(jsonArray);

  return xmlTemplate.replace("?", result);
}

function racikXMLObject(xmlTemplate, jsonArray, rootHead) {
  var builder = new xml2js.Builder({ headless: true, rootName: rootHead });
  const result = builder.buildObject(jsonArray[0]);
  return xmlTemplate.replace("?", result);
}
function racikXMLObject2(xmlTemplate, jsonArray, rootHead) {
  var builder = new xml2js.Builder({ headless: true, rootName: rootHead });
  const result = builder.buildObject(jsonArray[0]);
  return xmlTemplate.replace("#", result);
}
function racikXML2Object(xmlTemplate, jsonArray, rootHead, rootSecond) {
  var builder = new xml2js.Builder({ headless: true, rootName: rootHead });
  const result = builder.buildObject(jsonArray[0]);
  var builder = new xml2js.Builder({ headless: true, rootName: rootSecond });
  const result1 = builder.buildObject(jsonArray[1]);
  return xmlTemplate.replace("?", result + result1);
}
function racikXML2Object2(xmlTemplate, jsonArray, rootHead, rootSecond) {
  var builder = new xml2js.Builder({ headless: true, rootName: rootHead });
  const result = builder.buildObject(jsonArray[0]);
  var builder = new xml2js.Builder({ headless: true, rootName: rootSecond });
  const result1 = builder.buildObject(jsonArray[1]);
  return xmlTemplate.replace("#", result + result1);
}

function pad(d) {
  return d < 10 ? "0" + d.toString() : d.toString();
}

function base64_encode(file) {
  var bitmap = fs.readFileSync(file);
  return new Buffer(bitmap).toString("base64");
}

async function generateNoFKR(org_id, kode_shipto, today) {
  await DB.poolConnect;
  const request = DB.pool.request();
  let nomorFKR = ``;
  try {
    // let sqlgetOrg = `SELECT * FROM m_distributor_v WHERE m_distributor_id = '${org_id}'`;
    // let getOrg = await request.query(sqlgetOrg);
    // let dataorg = getOrg.recordset[0];

    queryDataTable = `
      SELECT COUNT(1) + 1 AS totalrows FROM document_number dn,document_number_line dnl 
      WHERE dn.kode='FKR'
      AND dn.document_number_id = dnl.document_number_id
      AND dnl.r_organisasi_id = '${org_id}'`;

    // console.log(queryDataTable);

    let getsequence = await request.query(queryDataTable);
    const row = getsequence.recordset[0];
    let totalrows = pad(row.totalrows);
    let bulan = moment(today, "YYYY-MM-DD").format("MMM");
    let tahun = moment(today, "YYYY-MM-DD").format("YYYY");
    nomorFKR =
      tahun +
      "/FKR/" +
      bulan.toLocaleUpperCase() +
      "/" +
      kode_shipto +
      "/" +
      totalrows;
  } catch (error) {
    console.log(error);
    nomorFKR = "0";
  }

  return nomorFKR;
}

function _generateTable(table) {
  if (table.length > 0) {
    const addRowSpan = (column, i, rspan = true, cn = "") => {
      var row = table[i],
        prevRow = table[i - 1],
        td = `<td class="${cn}">${row[column]}</td>`;
      if (rspan) {
        if (prevRow && row[column] === prevRow[column]) {
          td = ``;
        } else {
          var rowspan = 1;

          for (var j = i; j < table.length - 1; j++) {
            if (table[j][column] === table[j + 1][column]) {
              rowspan++;
            } else {
              break;
            }
          }
          td = `<td class="${cn}" rowSpan="${rowspan}">${row[column]}</td>`;
        }
      }

      return td;
    };

    let content = "";
    for (let i = 0; i < table.length; i++) {
      content = content + `<tr>`;
      content = content + addRowSpan("nomor", i, false, "center");
      content = content + addRowSpan("kode_sap", i, false, "left");
      content = content + addRowSpan("kode_produk", i, false, "left");
      content = content + addRowSpan("nama_barang", i, false, "left");
      content = content + addRowSpan("satuan", i, false, "left");
      content = content + addRowSpan("total_retur", i, false, "right");
      content = content + addRowSpan("expired_gudang", i, false, "right");
      content = content + addRowSpan("expired_toko", i, false, "right");
      content = content + addRowSpan("damage", i, false, "right");
      content = content + addRowSpan("recall", i, false, "right");
      content = content + addRowSpan("retur_administratif", i, false, "right");
      content = content + addRowSpan("rusak_di_jalan", i, false, "right");
      content = content + addRowSpan("misspart", i, false, "right");
      content = content + addRowSpan("peralihan", i, false, "right");
      content = content + addRowSpan("repalcement", i, false, "right");
      content = content + addRowSpan("delisting", i, false, "right");
      content = content + addRowSpan("keterangan", i, false, "left");
      content = content + `</tr>`;
    }

    return content;
  }

  return "<tr><td>No Data</td></tr>";
}

function _generateTableProgress(table) {
  if (table.length > 0) {
    const addRowSpan = (column, i, rspan = true, cn = "") => {
      var row = table[i],
        prevRow = table[i - 1],
        td = `<td class="${cn}">${row[column]}</td>`;

      if (rspan) {
        if (prevRow && row[column] === prevRow[column]) {
          td = ``;
        } else {
          var rowspan = 1;

          for (var j = i; j < table.length - 1; j++) {
            if (table[j][column] === table[j + 1][column]) {
              rowspan++;
            } else {
              break;
            }
          }
          td = `<td class="${cn}" rowSpan="${rowspan}">${row[column]}</td>`;
        }
      }

      return td;
    };

    let content = "";
    for (let i = 0; i < table.length; i++) {
      content = content + `<tr>`;
      content = content + addRowSpan("line", i, false, "center");
      content = content + addRowSpan("approval", i, false, "left");
      content = content + addRowSpan("status", i, false, "left");
      content = content + `</tr>`;
    }

    return content;
  }

  return "<tr><td>No Data</td></tr>";
}

function _generateDetailsApproveEmail(table) {
  if (table.length > 0) {
    const addRowSpan = (column, i, rspan = true, cn = "") => {
      var row = table[i],
        prevRow = table[i - 1],
        td = `<td class="${cn}">${row[column]}</td>`;

      if (rspan) {
        if (prevRow && row[column] === prevRow[column]) {
          td = ``;
        } else {
          var rowspan = 1;

          for (var j = i; j < table.length - 1; j++) {
            if (table[j][column] === table[j + 1][column]) {
              rowspan++;
            } else {
              break;
            }
          }
          td = `<td class="${cn}" rowSpan="${rowspan}">${row[column]}</td>`;
        }
      }

      return td;
    };

    let content = "";
    for (let i = 0; i < table.length; i++) {
      content = content + `<tr>`;
      content = content + addRowSpan("kode_produk", i, false, "center");
      content = content + addRowSpan("nama_barang", i, false, "left");
      content = content + addRowSpan("satuan", i, false, "left");
      content = content + addRowSpan("total_retur", i, false, "right");
      content = content + addRowSpan("keterangan", i, false, "right");
      content = content + `</tr>`;
    }

    return content;
  }

  return "<tr><td>No Data</td></tr>";
}

async function uploadFiles(id, file) {
  var uploadFile = file;
  // console.log(uploadFile);
  let filenames = ``;
  uploadFile.upload(
    { maxBytes: 500000000000 },
    async function onUploadComplete(err, files) {
      if (err) {
        let errMsg = err.message;
        console.log(errMsg);
        return res.error(errMsg);
      }
      console.log(id, "px");
      for (const file of files) {
        console.log("filename", file.filename);
        filenames = file.filename;
        fs.mkdirSync(dokumentPath("fkr_bap", id), {
          recursive: true,
        });
        const filesamaDir = glob.GlobSync(
          path.resolve(
            dokumentPath("fkr_bap", id),
            file.filename.replace(/\.[^/.]+$/, "")
          ) + "*"
        );
        if (filesamaDir.found.length > 0) {
          console.log("isexist file nama sama", filesamaDir.found[0]);
          fs.unlinkSync(filesamaDir.found[0]);
        }
        fs.renameSync(
          file.fd,
          path.resolve(dokumentPath("fkr_bap", id), file.filename)
        );
      }
      // console.log("asdas");
    }
  );
}

async function uploadFilesKembali(id, file, folder) {
  var uploadFile = file;
  uploadFile.upload(
    { maxBytes: 500000000000 },
    async function onUploadComplete(err, files) {
      if (err) {
        let errMsg = err.message;
        return errMsg;
      }
      console.log("gak err kok");
      console.log(id, "px");
      console.log("ini logh list files", files);
      for (const file of files) {
        console.log("filename", file.filename);
        filenames = file.filename;
        fs.mkdirSync(dokumentPath(folder, id), {
          recursive: true,
        });
        const filesamaDir = glob.GlobSync(
          path.resolve(
            dokumentPath(folder, id),
            file.filename.replace(/\.[^/.]+$/, "")
          ) + "*"
        );
        if (filesamaDir.found.length > 0) {
          console.log("isexist file nama sama", filesamaDir.found[0]);
          fs.unlinkSync(filesamaDir.found[0]);
        }
        fs.renameSync(
          file.fd,
          path.resolve(dokumentPath(folder, id), file.filename)
        );
      }
      // console.log("asdas");
    }
  );
}


function convertToRupiah(angka) {
  var rupiah = "";
  var angkarev = angka.toString().split("").reverse().join("");
  for (var i = 0; i < angkarev.length; i++)
    if (i % 3 == 0) rupiah += angkarev.substr(i, 3) + ".";
  return (
    "Rp. " +
    rupiah
      .split("", rupiah.length - 1)
      .reverse()
      .join("")
  );
}

function buatxml(so, layer) {
  let xml = fs.readFileSync("soap/ZFM_WS_UPDATEAPP.xml", "utf-8");
  let datas = [so, layer];

  let hasil = racikXML2Object(xml, datas, "VBELN", "STAGE");
  return hasil;
}
function buatxml2(so, layer) {
  let xml = fs.readFileSync("soap/REQUEST_SOAP.xml", "utf-8");
  let datas = [so, layer];

  let hasil = racikXML2Object2(xml, datas, "VBELN", "STAGE");
  return hasil;
}

async function kirimEmail(fkr_id, title, request) {
  let dcek = await request.query(
    `SELECT * FROM fkr_v WHERE fkr_id = '${fkr_id}'`
  );
  let ds = dcek.recordset;
  let kode_status = ds[0].kode_status;
  let catatan = ``;
  if (kode_status == `WT1`) {
    catatan = `Dokumen Menunggu Pengembalian BA, Surat Jalan dan Bukti foto`;
  } else if (kode_status == `WT6`) {
    catatan = `Dokumen Menunggu Pengembalian distributor upload NRP & APS`;
  }

  let getdataemail =
    await request.query(`SELECT email_verifikasi FROM email_distributor a
    inner join m_distributor_v b on a.m_distributor_id = b.m_distributor_id 
    WHERE b.kode_pajak = '${ds[0].kode_pajak}'
    AND tipe = 'FKR'
    group by email_verifikasi`);

  let dataemail = [];
  for (let i = 0; i < getdataemail.recordset.length; i++) {
    dataemail.push(getdataemail.recordset[i].email_verifikasi);
  }
  dataemail.push(["indra.suandi@enesis.com"]);
  const param = {
    nomorfkr: ds[0].nomor_fkr,
    subject: title,
    distributor: ds[0].nama_distributor,
    eksekusi: ds[0].eksekusi,
    periode: ds[0].created,
    nomor_so: ds[0].nomor_so,
    Pengajuan: ds[0].status,
    note: catatan,
  };

  const template = await sails.helpers.generateHtmlEmail.with({
    htmltemplate: "fkr_progress0",
    templateparam: param,
  });
  console.log(template);

  let sqlgetstatusIntegasi = `SELECT TOP 1 * FROM integration_url ORDER BY created DESC`;
  let datastatusIntegasi = await request.query(sqlgetstatusIntegasi);
  let statusIntegasi =
    datastatusIntegasi.recordset.length > 0
      ? datastatusIntegasi.recordset[0].status
      : "DEV";

  if (statusIntegasi == "DEV") {
    let emaildev = [];
    emaildev.push("tiasadeputra@gmail.com");
    emaildev.push("ilyas.nurrahman@gmail.com");

    SendEmail(emaildev.toString, param.subject, template);
  } else {
    SendEmail(dataemail.toString, param.subject, template);
  }
}

async function callSoapApprove(hasil) {
  //let url = `http://sapprdene.enesis.com:8310/sap/bc/srt/rfc/sap/zws_ws_updateapp/300/zws_ws_updateapp/zbn_ws_updateapp`;
  await DB.poolConnect;
  const request = DB.pool.request();

  let sqlgetstatusIntegasi = `SELECT TOP 1 * FROM integration_url ORDER BY created DESC`;
  let datastatusIntegasi = await request.query(sqlgetstatusIntegasi);
  let statusIntegasi =
    datastatusIntegasi.recordset.length > 0
      ? datastatusIntegasi.recordset[0].status
      : "DEV";
  let usernamesoap = sails.config.globals.usernamesoap;
  let passwordsoap = sails.config.globals.passwordsoap;

  let url = ``;
  if (statusIntegasi == "DEV") {
    url = `http://sapdevene.enesis.com:8010/sap/bc/srt/rfc/sap/zws_ws_updateapp/120/zws_ws_updateapp/zbn_ws_updateapp`;
    usernamesoap = sails.config.globals.usernamesoapdev;
    passwordsoap = sails.config.globals.passwordsoapdev;
  } else {
    url = `http://sapprdene.enesis.com:8310/sap/bc/srt/rfc/sap/zws_ws_updateapp/300/zws_ws_updateapp/zbn_ws_updateapp`;
    usernamesoap = sails.config.globals.usernamesoap;
    passwordsoap = sails.config.globals.passwordsoap;
  }

  const tok = `${usernamesoap}:${passwordsoap}`;
  const hash = Base64.encode(tok);
  const Basic = "Basic " + hash;

  let headers = {
    Authorization: Basic,
    "user-agent": "esalesSystem",
    "Content-Type": "text/xml;charset=UTF-8",
    soapAction:
      "urn:sap-com:document:sap:rfc:functions:ZWS_WS_UPDATEAPP:ZFM_WS_UPDATEAPPRequest",
  };
  let { response } = await soapRequest({
    url: url,
    headers: headers,
    xml: hasil,
    timeout: 1000000,
  });

  return response;
}

async function lemparFTP(hasil, fkr_id) {
  // console.log(ftpconfig);
  await DB.poolConnect;
  const request = DB.pool.request();

  let sqlgetstatusIntegasi = `SELECT TOP 1 * FROM integration_url ORDER BY created DESC`;
  let datastatusIntegasi = await request.query(sqlgetstatusIntegasi);
  let statusIntegasi =
    datastatusIntegasi.recordset.length > 0
      ? datastatusIntegasi.recordset[0].status
      : "DEV";

  let remotePath = ``;
  if (statusIntegasi == "DEV") {
    remotePath = "/home/sapftp/esales/fkr/status/requestdev/" + `${fkr_id}.xml`; // development
  } else {
    remotePath = "/home/sapftp/esales/fkr/status/request/" + `${fkr_id}.xml`; // production
  }
  //let remotePath = '/home/sapftp/esales/fkr/status/request/'+`${fkr_id}.xml`;
  let locationFiles = dokumentPath("fkrstatus", "request").replace(/\\/g, "/");
  let dst = dokumentPath("fkrstatus", "request") + "/" + `${fkr_id}.xml`;
  let localPath = dst.replace(/\\/g, "/");
  shell.mkdir("-p", locationFiles);
  console.log(locationFiles + "/" + `${fkr_id}.xml`);
  fs.writeFile(
    locationFiles + "/" + `${fkr_id}.xml`,
    hasil,
    async function (err) {
      if (err) return err;

      await sftp
        .connect(ftpconfig)
        .then(() => {
          return sftp.fastPut(localPath, remotePath);
        })
        .then(() => {
          sftp.end();
        })
        .catch((err) => {
          console.log('Error saat lempar');
          console.error(err.message);
        });
    }
  );
}
//retur 2021

function checkRole(userRoles, roles) {
  const isTrue = userRoles.some((e) => roles.includes(e.nama));
  return isTrue;
}

function checkUserSalesHO(userRoles, userId) {
  const isTrue = userRoles.some((e) => userId.includes(e.m_user_id));
  return isTrue;
}
