/* eslint-disable no-undef */
/**
 * SampeCrudController
 *
 * @description :: Server-side actions for handling incoming requests.
 * @help        :: See https://sailsjs.com/docs/concepts/actions
 */

const { calculateLimitAndOffset, paginate } = require("paginate-info");
const axios = require("axios");
const moment = require("moment");
// const path = require('path')
const uuid = require("uuid/v4");
const fs = require("fs");
const path = require("path");
const glob = require("glob");
const numeral = require("numeral");
const _ = require("lodash");
const SendEmail = require("../../../services/SendEmail");
const json2xls = require("json2xls");

const Base64 = require("base-64");
const soapRequest = require("easy-soap-request");
const xml2js = require("xml2js");
const DBPROP = require("../../../services/DBPROPOSAL");
const momentBusinessDays = require("moment-business-days");

const dokumentPath = (param2, param3) =>
  path.resolve(sails.config.appPath, "repo", param2, param3);
const re = /(?:\.([^.]+))?$/;
const getExtOnly = (str, adddot = true) => {
  const result = re.exec(str)[1];
  if (result) return adddot ? "." + result : result;
  return "";
};
module.exports = {
  // GET ALL RESOURCE

  findebupot: async function (req, res) {
    const {
      query: { klaim_id },
    } = req;
    // console.log(klaim_id);

    await DB.poolConnect;
    const request = DB.pool.request();
    try {
      let cekstatus = `SELECT * FROM klaim WHERE klaim_id = '${klaim_id}'`;
      // console.log(cekstatus);
      let dscek = await request.query(cekstatus);
      let datasource = dscek.recordset;
      // let years = currentTime.getFullYear()
      let no_sap =
        datasource.length > 0 ? datasource[0].accounting_document_number : null;
      let years = datasource.length > 0 ? datasource[0].fiscal_year : null;

      let sqlGetRekapEbupot = `SELECT * FROM rekap_ebupot WHERE no_doc_sap = '${no_sap}' AND fiscal_year = ${years} AND company_code = '2100'`;
      let dataRekapEbupot = await request.query(sqlGetRekapEbupot);
      let rekapEbupot = dataRekapEbupot.recordset;
      let nama_file_baru = ``;
      let nomor_ebp = ``;
      if (rekapEbupot.length > 0) {
        nomor_ebp = rekapEbupot[0].no_ebupot;
      } else {
        nama_file_baru = no_sap;
      }

      // baca semua file yg ada di direktory
      let filenames = fs.readdirSync(`X:/${years}/2100`);
      filenames.forEach((file) => {
        console.log(`cari`);
        if (file.includes(`${nomor_ebp}_`)) {
          console.log(`nemu nih`, file);
          nama_file_baru = file;
        }
      });
      const host = `X:/${years}/2100/${nama_file_baru}`;

      let direktori = host;
      // fs.statSync(direktori);
      return res.download(direktori);
    } catch (error) {
      // console.log(error);
      return res.error({
        message: "Kemungkinan dokument belum tersedia..",
      });
    }
  },

  find: async function (req, res) {
    const {
      query: {
        currentPage,
        pageSize,
        searchText,
        periode,
        periode1,
        status,
        m_pajak_id,
        region_id,
        dataDistributor,
        m_user_id,
        jenis,
        r_distribution_channel_id,
      },
    } = req;
    console.log(m_user_id);
    console.log(req.query);
    await DB.poolConnect;
    try {
      const request = DB.pool.request();
      const { limit, offset } = calculateLimitAndOffset(currentPage, pageSize);

      let salesHeadDistributionChannel = '';
      let cekIsSalesHead = `select r_distribution_channel_id  from sales_head where m_user_id = '${m_user_id}'`;
      let getIsSalesHead = await request.query(cekIsSalesHead);
      if(getIsSalesHead.recordset.length > 0){
        salesHeadDistributionChannel = getIsSalesHead.recordset[0].r_distribution_channel_id;
      }


   
      let WherePeriode = ``;
      if (periode && periode1) {
        WherePeriode = ` AND CONVERT(VARCHAR(10),kl.created,120) BETWEEN '${periode}' AND '${periode1}' `;
      }

      let whereJenis = ``;
      if (jenis) {
        whereJenis = ` AND kl.jenis_klaim = '${jenis}' `;
      }

      let whereMdistributor = ``;
      if (dataDistributor) {
        let distributorId = dataDistributor.recordset.map(function (item) {
          return item["m_distributor_id"];
        });

        let valueINDistributorId = "";
        for (const datas of distributorId) {
          valueINDistributorId += ",'" + datas + "'";
        }
        valueINDistributorId = valueINDistributorId.substring(1);

        whereMdistributor = ` AND m_distributor_id IN (${valueINDistributorId}) `;

        console.log(valueINDistributorId);

      }

      let WherePajak = ``;
      if (m_pajak_id) {
        WherePajak = `AND kl.m_pajak_id = '${m_pajak_id}'`;
      }

      let WhereStatus = ``;
      if (status) {
        WhereStatus = `AND kl.kode_status = '${status}'`;
      }


      let WhereChannel = ``;
      if(r_distribution_channel_id || salesHeadDistributionChannel != ''){
        WhereChannel = `AND kl.r_distribution_channel_id = '${r_distribution_channel_id}'`;
      }

      let WhereRegion = ``;
      if(region_id){
        WhereRegion = `AND kl.kode_region = '${region_id}'`;
      }

      let whereClauseSearch = ``;
      if (searchText) {
          whereClauseSearch = `AND (kl.nomor_klaim LIKE '%${searchText}%' OR kl.accounting_document_number LIKE '%${searchText}%' OR kl.total_klaim LIKE '%${searchText}%')`;
      }

      let queryCountTable = `SELECT COUNT(1) AS total_rows FROM klaim_v kl WHERE 1=1 
      ${whereMdistributor} ${WherePajak} ${WhereChannel} ${WhereRegion} ${whereJenis} ${WherePeriode} ${WhereStatus} ${whereClauseSearch}`;

      const totalItems = await request.query(queryCountTable);
      const count = totalItems.recordset[0].total_rows || 0;

    
      let queryDataTable = `SELECT klaim_id,kode_status,nomor_klaim,created,nama,total_klaim,nominal_pajak,nominal_claimable,status,
      accounting_document_number,region,sales_approve_amount,
      CASE WHEN tanggal_posting IS NOT NULL THEN CONVERT(VARCHAR(12),DATEADD(day, 30, tanggal_posting),120) ELSE '-' END estimated_date,m_distributor_id,
      jenis_klaim,file_invoice,file_surat_klaim_sesuai_prinsiple,file_faktur_pajak,file_eproposal,file_ktp,file_rekap_klaim,file_copy_faktur,file_skp,
      file_program,nomor_ktp,nama_ktp,nomor_npwp,nama_npwp,nomor_faktur,tipe_pajak,tanggal_faktur_pajak,tanggal_invoice,perihal_klaim,m_pajak_id,
      invoice,company_code,periode_klaim
      FROM klaim_v kl 
      WHERE 1=1 ${whereMdistributor} ${WherePajak} ${WhereChannel} ${WhereRegion} ${whereJenis}
      ${WherePeriode} ${WhereStatus} ${whereClauseSearch}
      ORDER BY kl.created DESC
      OFFSET ${offset} ROWS
      FETCH NEXT ${limit} ROWS ONLY`;

      console.log(queryDataTable);

      request.query(queryDataTable, async (err, result) => {
        if (err) {
          return res.error(err);
        }

        const rows = result.recordset;
        const meta = paginate(currentPage, count, rows, pageSize);

        for (let i = 0; i < rows.length; i++) {
      

          let klaim_id = rows[i].klaim_id;
          let queryDataLeadtime = `SELECT TOP 1 DATEDIFF(second, created , GETDATE()) AS difference,
              CONVERT(VARCHAR(12),created,120) AS lastactiondate
              FROM audit_klaim 
              WHERE klaim_id = '${klaim_id}' 
              AND isactive='Y'
              ORDER BY created DESC`;

          let getDataDifference = await request.query(queryDataLeadtime);
          let lastactiondate = getDataDifference.recordset.length > 0 ? moment(getDataDifference.recordset[0].lastactiondate,"YYYY-MM-DD").format("YYYY-MM-DD") : null;

          let leadtime = `-`;
          let sla = 2;

          if (rows[i].kode_status == "DR") {
            sla = 4;
          } else if (rows[i].kode_status == "VER") {
            sla = 4;
          } else if (rows[i].kode_status == "VERACC") {
            sla = 14;
          } else if (rows[i].kode_status == "DTA") {
            sla = 3;
          } else if (rows[i].kode_status == "DVS") {
            sla = 3;
          } else if (rows[i].kode_status == "APR") {
            sla = 2;
          } else if (rows[i].kode_status == "DAD") {
            sla = 2;
          } else if (rows[i].kode_status == "TDF") {
            sla = 2;
          } else if (rows[i].kode_status == "APF") {
            sla = 2;
          } else if (rows[i].kode_status == "SKP") {
            sla = 14;
          }else if (rows[i].kode_status == "PAY") {
            sla = 30;
          }

          if (lastactiondate) {
            let data = momentBusinessDays(
              lastactiondate,
              "YYYY-MM-DD"
            ).businessAdd(sla)._d;
            leadtime = moment(data).format("YYYY-MM-DD");
          }

          let timeAllert = false;

          if (moment() > moment(leadtime, "YYYY-MM-DD")) {
            timeAllert = true;
          }

          if (rows[i].estimated_date == "-") {
            rows[i].leadTime = leadtime;
          } else {
            rows[i].leadTime = leadtime;
          }

          rows[i].timeAllert = timeAllert;

        }

        return res.success({
          result: rows,
          meta,
          message: "Fetch data successfully...",
        });
      });
    } catch (err) {
      return res.error(err);
    }
  },


  findBackup: async function (req, res) {
    const {
      query: {
        currentPage,
        pageSize,
        m_user_id,
        searchText,
        periode,
        periode1,
        status,
        m_pajak_v_id,
        region_id,
        m_distributor_id,
        jenis,
        filter,
        nomor_klaim,
      },
    } = req;

    console.log(req.query);
    await DB.poolConnect;
    try {
      const request = DB.pool.request();
      const { limit, offset } = calculateLimitAndOffset(currentPage, pageSize);

      let WherePeriode = ``;
      if (periode && periode1) {
        WherePeriode = ` AND CONVERT(VARCHAR(10),kl.created,120) BETWEEN '${periode}' AND '${periode1}' `;
      }

      let whereJenis = ``;
      if (jenis) {
        whereJenis = ` AND kl.jenis_klaim = '${jenis}' `;
      }

      let whereMdistributor = ``;
      if (m_distributor_id) {
        //whereMdistributor = ` AND kl.m_distributor_id = '${m_distributor_id}'`;
        whereMdistributor = ``;
      }

      let WherePajak = ``;
      if (m_pajak_v_id) {
        WherePajak = `AND kl.m_pajak_id = '${m_pajak_v_id}'`;
      }

      let WhereStatus = ``;
      if (status) {
        WhereStatus = `AND kl.kode_status = '${status}'`;
      }

      let whereClauseStatusRegion = ``;
      if (status) {
        whereClauseStatusRegion = `AND kl.kode_status IN ('${status}')`;
      }


      let sqlGetRole = `SELECT * FROM m_user_role_v murv WHERE m_user_id='${m_user_id}'`;
      let datarole = await request.query(sqlGetRole);
      let rolename = datarole.recordset.length > 0 ? datarole.recordset[0].nama : undefined;
      //CEK CHANNEL


      let whereDtb = ``;
      // console.log(role);
      // console.log(datarole);

      let ascdesc = "ASC";
      if (rolename == "RSDH") {
        // console.log("masuk ke if RSDH");
        let sqlCekDataDistributor = `SELECT DISTINCT m_distributor_id 
        FROM m_rsm WHERE m_user_id = '${m_user_id}'`;
        // console.log(sqlCekDataDistributor, "cek data distributor");

        let datacek = await request.query(sqlCekDataDistributor);

        let distributorId = datacek.recordset.map(function (item) {
          return item["m_distributor_id"];
        });

        let valueINDistributorId = "";
        for (const datas of distributorId) {
          valueINDistributorId += ",'" + datas + "'";
        }
        valueINDistributorId = valueINDistributorId.substring(1);

        whereDtb = ` AND m_distributor_id IN (${valueINDistributorId}) `;
        whereMdistributor = ``;
      }

      let whereClauseSearch = ``;
      if (searchText) {
        whereClauseSearch = `AND (kl.nomor_proposal LIKE '%${searchText}%'
          OR kl.nomor_klaim LIKE '%${searchText}%' OR kl.title LIKE '%${searchText}%'
          OR kl.date_prop LIKE '%${searchText}%'
          OR kl.company LIKE '%${searchText}%'
          OR kl.region LIKE '%${searchText}%'
          OR kl.total_klaim LIKE '%${searchText}%'
          OR kl.accounting_document_number LIKE '%${searchText}%' 
          OR kl.m_distributor_id LIKE '%${searchText}%')`;
      }

      let SQLGetUserRegion = `SELECT * FROM m_role_sales WHERE m_user_id = '${m_user_id}'`;
      let dataregion = await request.query(SQLGetUserRegion);
      let region = dataregion.recordset.map(function (item) {
        return item["kode_region"];
      });

      let valueINRegion = "";
      let listRegion = "";
      for (const datas of region) {
        valueINRegion += ",'" + datas + "'";
      }
      valueINRegion = valueINRegion.substring(1);

      if (region_id) {
        listRegion = `AND kl.kode_region = '${region_id}'`;
      } else {
        if (valueINRegion.length > 0) {
          listRegion = `AND kl.kode_region IN (${valueINRegion})`;
        }
      }

      //console.log(listRegion);
      console.log('rolename ',rolename);

      let valueIN = "";
      let listOrg = "";

      if (rolename == "SALESREGION") {
        whereClauseStatusRegion = ``;
      } else if (rolename == "SALESMTREGIONKLAIM") {
        whereClauseStatusRegion = ``;
      } else if (
        rolename == "SALESGTREGIONKLAIM" ||
        rolename == "SALEADMINFKR" ||
        rolename == "EXECUTOR-EPROP" ||
        rolename == "ADMIN-ERPOP" ||
        rolename == "APPROVAL-EPROP"
      ) {
        whereClauseStatusRegion = ``;
      } else if (rolename == "RSDH") {
        whereClauseStatusRegion = `AND kl.kode_status IN ('DVS','APS','APR','APN','APF','SKP','PAY','TDF','VDP')`;
      } else if (rolename == "NSDH" || rolename == "SALESHO3") {
        whereClauseStatusRegion = `AND kl.kode_status IN ('APS','APR','APN','APF','SKP','PAY','TDF','VDP')`;
      } else if (rolename == "ACCOUNTING2") {
        whereClauseStatusRegion = ``;
        if (filter) {
          whereClauseStatusRegion = `AND kl.kode_status = '${filter}'`;
        }
      } else if (rolename == "ACCOUNTING") {
        whereClauseStatusRegion = ``;
        if (filter) {
          whereClauseStatusRegion = `AND kl.kode_status = '${filter}'`;
        }
      } else if (rolename == "DISTRIBUTOR") {
        ascdesc = "DESC";

        let org = `SELECT DISTINCT r_organisasi_id FROM m_user_organisasi WHERE isactive='Y' AND m_user_id = '${m_user_id}'`;
        // console.log(org);
        let orgs = await request.query(org);
        let organization = orgs.recordset.map(function (item) {
          return item["r_organisasi_id"];
        });

        for (const datas of organization) {
          valueIN += ",'" + datas + "'";
        }

        valueIN = valueIN.substring(1);
        listOrg =
          organization.length > 0
            ? `AND kl.r_organisasi_id IN (${valueIN})`
            : "";
      }


      let sqlGetChannel = `SELECT * FROM sales_head WHERE m_user_id='${m_user_id}'`;
      let dataListChannel = await request.query(sqlGetChannel);
      //   console.log(datarole);

      let WhereChannel = ``;
      if (dataListChannel.recordset.length > 0) {
        if(rolename=='RSDH'){
          WhereChannel = `AND (kl.r_distribution_channel_id IN (SELECT r_distribution_channel_id FROM sales_head WHERE m_user_id = '${m_user_id}') OR m_distributor_id IN (${valueINDistributorId}))`;
        }else{
          WhereChannel = `AND kl.r_distribution_channel_id IN (SELECT r_distribution_channel_id FROM sales_head WHERE m_user_id = '${m_user_id}')`;
          whereDtb = ``;
        }
      }


      let queryCountTable = `SELECT COUNT(1) AS total_rows
                              FROM klaim_v kl 
                              WHERE 1=1 ${listOrg} ${whereClauseSearch} ${whereMdistributor}${WherePajak} 
                              ${whereClauseStatusRegion} ${WherePeriode} ${WhereChannel} 
                              ${WhereStatus} ${listRegion} ${whereDtb} ${whereJenis}`;

      const totalItems = await request.query(queryCountTable);
      const count = totalItems.recordset[0].total_rows || 0;
      if (!rolename) {
        listOrg = ``;
      }

      let queryDataTable = `SELECT *,
        CASE WHEN tanggal_posting IS NOT NULL THEN CONVERT(VARCHAR(12),DATEADD(day, 30, tanggal_posting),120) ELSE '-' END estimated_date
        FROM klaim_v kl 
        WHERE 1=1 ${listOrg} ${whereClauseSearch} ${whereMdistributor} 
        ${WherePajak} ${whereClauseStatusRegion} ${WherePeriode} ${WhereChannel} 
        ${WhereStatus} ${listRegion} ${whereDtb} ${whereJenis}
        ORDER BY kl.created ${ascdesc}
        OFFSET ${offset} ROWS
        FETCH NEXT ${limit} ROWS ONLY`;

      console.log(queryDataTable);

      request.query(queryDataTable, async (err, result) => {
        if (err) {
          return res.error(err);
        }

        const rows = result.recordset;
        const meta = paginate(currentPage, count, rows, pageSize);

        for (let i = 0; i < rows.length; i++) {
          rows[i].isopsipph = rows[i].opsional_pph > 0 ? true : false;
          let queryDataTableKlaimDetail = `SELECT * FROM klaim_detail WHERE klaim_id = '${rows[i].klaim_id}'`;

          let data_klaimdetail = await request.query(queryDataTableKlaimDetail);
          let klaimdetail = data_klaimdetail.recordset;
          for (let j = 0; j < klaimdetail.length; j++) {

            let sqlgetBudgetTerpakai = `SELECT SUM(CASE WHEN k.kode_status='DR' THEN kd.total_klaim WHEN k.kode_status='RJF' THEN 0 ELSE kd.total_klaim END) AS budget_terpakai 
            FROM klaim_detail kd,klaim k WHERE k.klaim_id = kd.klaim_id AND kd.budget_id = '${klaimdetail[j].budget_id}'`;
            // console.log(SqlgetBudgetTerpakai);
            let databudgetterpakai = await request.query(sqlgetBudgetTerpakai);
            let budget_terpakai = databudgetterpakai.recordset[0].budget_terpakai;

            klaimdetail[j].isclosed =
            klaimdetail[j].isclosed == "Y" ? true : false;
            klaimdetail[j].budget_awal_bgt = klaimdetail[j].budget_awal;
            klaimdetail[j].budget_terpakai = budget_terpakai;
          }

          if (klaimdetail.length > 0) {
            rows[i].lines = klaimdetail;
            rows[i].date_prop = rows[i].date_prop
              ? moment(rows[i].date_prop, "YYYY-MM-DD").format("YYYY-MM-DD")
              : rows[i].date_prop;
            rows[i].tanggal_faktur_pajak = rows[i].tanggal_faktur_pajak
              ? moment(rows[i].tanggal_faktur_pajak, "YYYY-MM-DD").format(
                  "YYYY-MM-DD"
                )
              : rows[i].tanggal_faktur_pajak;
            rows[i].tanggal_invoice = rows[i].tanggal_invoice
              ? moment(rows[i].tanggal_invoice, "YYYY-MM-DD").format(
                  "YYYY-MM-DD"
                )
              : rows[i].tanggal_invoice;
            rows[i].tanggal_posting = rows[i].tanggal_posting
              ? moment(rows[i].tanggal_posting, "YYYY-MM-DD").format(
                  "YYYY-MM-DD"
                )
              : rows[i].tanggal_posting;
            rows[i].updated = rows[i].updated
              ? moment(rows[i].updated, "YYYY-MM-DD").format("YYYY-MM-DD")
              : rows[i].updated;
          }

          let klaim_id = rows[i].klaim_id;
          let queryDataLeadtime = `SELECT TOP 1 DATEDIFF(second, created , GETDATE()) AS difference,
              CONVERT(VARCHAR(12),created,120) AS lastactiondate
              FROM audit_klaim 
              WHERE klaim_id = '${klaim_id}' 
              AND isactive='Y'
              ORDER BY created DESC`;

          // console.log(queryDataLeadtime);

          let getDataDifference = await request.query(queryDataLeadtime);
          let lastactiondate =
            getDataDifference.recordset.length > 0
              ? moment(
                  getDataDifference.recordset[0].lastactiondate,
                  "YYYY-MM-DD"
                ).format("YYYY-MM-DD")
              : null;

          let leadtime = `-`;
          let sla = 2;

          if (rows[i].kode_status == "DR") {
            sla = 4;
          } else if (rows[i].kode_status == "VER") {
            sla = 4;
          } else if (rows[i].kode_status == "VERACC") {
            sla = 14;
          } else if (rows[i].kode_status == "DTA") {
            sla = 3;
          } else if (rows[i].kode_status == "DVS") {
            sla = 3;
          } else if (rows[i].kode_status == "APR") {
            sla = 2;
          } else if (rows[i].kode_status == "DAD") {
            sla = 2;
          } else if (rows[i].kode_status == "TDF") {
            sla = 2;
          } else if (rows[i].kode_status == "APF") {
            sla = 2;
          } else if (rows[i].kode_status == "SKP") {
            sla = 14;
          }else if (rows[i].kode_status == "PAY") {
            sla = 30;
          }

          if (lastactiondate) {
            let data = momentBusinessDays(
              lastactiondate,
              "YYYY-MM-DD"
            ).businessAdd(sla)._d;
            leadtime = moment(data).format("YYYY-MM-DD");
          }

          let timeAllert = false;

          if (moment() > moment(leadtime, "YYYY-MM-DD")) {
            timeAllert = true;
          }

          if (rows[i].estimated_date == "-") {
            rows[i].leadTime = leadtime;
          } else {
            rows[i].leadTime = leadtime;
          }

          rows[i].lastAction = lastactiondate;
          rows[i].timeAllert = timeAllert;

          // console.log("leadtime ", rows[i].leadTime);
          // console.log("timeAllert ", rows[i].timeAllert);
        }

        return res.success({
          result: rows,
          meta,
          message: "Fetch data successfully...",
        });
      });
    } catch (err) {
      return res.error(err);
    }
  },

  rejectPo: async function (req, res) {
    const {
      nomor_po,
    } = req.body;
    await DB.poolConnect;
    try {
      console.log("nomor_po",nomor_po);
      const request = DB.pool.request();
      let queryReject = `update eprop_klaim_po set isreject = 'Y' WHERE nomor_po = '${nomor_po}'`;
      await request.query(queryReject);

      return res.success({
        message: 'Reject PO Berhasil'
      });

    } catch (err) {
      return res.error({
        message : err
      });
    }
  },
  getBudget: async function (req, res) {
    const {
      query: { doc_no },
    } = req;
    await DB.poolConnect;
    try {
      const year = new Date().getFullYear() ;
      const request = DB.pool.request();
      const requestDBPROP = await DBPROP.promise();
      // let queryBudget = `SELECT * FROM v_getexpiredproposal WHERE doc_no = '${nomoreprop_param}'`;
      let queryBudget = `SELECT `+
        `m_brand.brand_desc, `+
        `m_brand.brand_code, `+
        `proposal_budget.branch_code, `+
        `proposal_budget.budget, `+
        `proposal_budget.proposal_budget_id, `+
        `m_activity.activity_desc, `+
        `proposal_budget.activity_id `+
      `FROM m_brand `+
      `JOIN proposal_budget on proposal_budget.brand_code = m_brand.brand_code `+ 
      `JOIN proposal on proposal.proposal_id = proposal_budget.proposal_id `+
      `JOIN m_activity on m_activity.activity_code = proposal_budget.activity_id `+
      `WHERE proposal.doc_no = '${doc_no}' AND m_activity.active = '1' AND m_activity.year = '${year}'`;
      let resp = [];
      let getBudget = await requestDBPROP.query(queryBudget);
      if(getBudget[0].length > 0){
        for(let n = 0; n < getBudget[0].length; n++){
          let queryTotalKlaim = `SELECT sum(amount) as totalKlaim FROM eprop_klaim_po ekp WHERE budget_id = '${getBudget[0][n].proposal_budget_id}' AND isreject = 'N'`;
          let totalKlaim = await request.query(queryTotalKlaim);
          let dataTotalKlaim = totalKlaim.recordset[0].totalKlaim;
          let data = {};
          data.brand_desc = getBudget[0][n].brand_desc;
          data.brand_code = getBudget[0][n].brand_code;
          data.branch_code = getBudget[0][n].branch_code;
          data.budget = getBudget[0][n].budget-dataTotalKlaim;
          data.proposal_budget_id = getBudget[0][n].proposal_budget_id;
          data.activity_desc = getBudget[0][n].activity_desc;
          data.activity_id = getBudget[0][n].activity_id;
          resp.push(data);
        }
      }

      return res.success({
        result: resp,
        message: 'Berhasil'
      });

    } catch (err) {
      return res.error({
        message : err
      });
    }
  },
  getKlaimDetailByKlaimId: async function (req, res) {
    await DB.poolConnect;
    try {
      // console.log(m_user_id);
      const request = DB.pool.request();
      let queryDataTableKlaimDetail = `SELECT * FROM klaim_detail WHERE klaim_id = '${req.param("id")}'`;

      console.log(queryDataTableKlaimDetail);

      let data_klaimdetail = await request.query(queryDataTableKlaimDetail);
      let klaimdetail = data_klaimdetail.recordset;

      for (let j = 0; j < klaimdetail.length; j++) {
    
        let sqlgetBudgetTerpakai = `SELECT SUM(kd.total_klaim) AS budget_terpakai 
        FROM klaim_detail kd,klaim k 
        WHERE k.klaim_id = kd.klaim_id AND kd.budget_id = '${klaimdetail[j].budget_id}'`;

        let databudgetterpakai = await request.query(sqlgetBudgetTerpakai);
        let budget_terpakai = databudgetterpakai.recordset[0].budget_terpakai;

        klaimdetail[j].isclosed = klaimdetail[j].isclosed == "Y" ? true : false;
        klaimdetail[j].budget_awal_bgt = klaimdetail[j].budget_awal;
        klaimdetail[j].budget_terpakai = budget_terpakai;
        klaimdetail[j].company = klaimdetail[j].company_code;
        klaimdetail[j].ischecked = false;
      
      }

      return res.success({
        result: klaimdetail,
        message: 'Berhasil'
      });

    } catch (err) {
      return res.error({
        message : err
      });
    }
  },
  notifikasiklaim: async function (req, res) {
    const { m_user_id } = req.body;
    await DB.poolConnect;
    try {
      // console.log(m_user_id);
      const request = DB.pool.request();
      let sel = `SELECT kode_status,status,COUNT(DISTINCT klaim_id)as jml FROM notifikasi_klaim
              WHERE m_user_id = '${m_user_id}' AND is_proses <> 1
              GROUP BY kode_status,status`;

      // console.log(sel);
      let resNotif = await request.query(sel);
      let dataResNotif = resNotif.recordset;

      let sqlNotifRow = `SELECT COUNT(*) AS jml FROM notifikasi_klaim WHERE m_user_id = '${m_user_id}' AND is_proses <> 1`;
      let notifRow = await request.query(sqlNotifRow);
      let dsNotifRow = notifRow.recordset;
      dsNotifRow = dsNotifRow.length > 0 ? dsNotifRow[0].jml : 0;

      let finalresult = {
        jumlah: dsNotifRow,
        rowdata: dataResNotif,
      };
      // console.log(finalresult);

      return res.success({
        error: "false",
        result: finalresult,
        message: "Sukses",
      });
    } catch (err) {
      return res.error(err);
    }
  },
  findOne: async function (req, res) {
    await DB.poolConnect;
    try {
      const request = DB.pool.request();

      let queryDataTable = `SELECT *,'xxxx' as budget_awal_bgt
      FROM klaim_v kl
      WHERE 1 = 1 AND kl.klaim_id='${req.param("id")}'`;

      //console.log(queryDataTable);
      request.query(queryDataTable, async (err, result) => {
        if (err) {
          return res.error(err);
        }

        const row = result.recordset[0];

        row.isopsipph = row.opsional_pph
          ? row.opsional_pph > 0
            ? true
            : false
          : false;
        let queryDataTableKlaimDetail = `SELECT *
          FROM klaim_detail WHERE klaim_id = '${row.klaim_id}'`;
        // console.log("queryDataTableKlaimDetail", queryDataTableKlaimDetail);
        let data_klaimdetail = await request.query(queryDataTableKlaimDetail);
        let klaimdetail1 = data_klaimdetail.recordset;

        let queryDataTable = `SELECT createddate as reject_date ,alasan as reason_reject, mu.nama as reject_by FROM reject_klaim_log a 
          INNER JOIN m_user mu ON a.m_user_id = mu.m_user_id 
          WHERE klaim_id = '${req.param("id")}'  order BY createddate DESC `;

        // console.log("queryDataTable", queryDataTable);

        let data_reject = await request.query(queryDataTable);
        // console.log(data_reject);
        let listReason = data_reject.recordset;

        // console.log("momom");

        for (let i = 0; i < listReason.length; i++) {
          listReason[i].no = i + 1;
        }

        row.listReason = listReason;

        let flow = `SELECT klaim_id,CONVERT(VARCHAR(10),a.created,120) as tgl_proses, CASE WHEN status = 'PENGAJUAN' THEN 'Pengajuan' ELSE status END as nama,
          case when rolename = 'SALESHO3'  then 'Approve Sales Head' 
          when rolename = 'SALESGTREGIONKLAIM' then replace(status,rolename,'')
          when rolename = 'SALESMTREGIONKLAIM' then replace(status,rolename,'')
          when rolename = 'DISTRIBUTOR'then'Pengajuan'
          when rolename = 'SALESREGION'then replace(status,rolename,'')
          when rolename = 'ACCOUNTING2' THEN replace(status,rolename,'')
          when rolename = 'ACCOUNTING' THEN replace(status,rolename,'')
          when rolename = 'RSDH' then 'Approve RSM'
          else rolename end as sts
          ,'8' as region_id
          FROM audit_klaim a
          WHERE klaim_id = '${row.klaim_id}'
          AND a.isactive='Y'
          ORDER BY a.created asc`;

        let datax = await request.query(flow);
        let flowprogress = datax.recordset;

        row.lines = klaimdetail1;
        row.details = flowprogress;
        row.date_prop = row.date_prop
          ? moment(row.date_prop, "YYYY-MM-DD").format("YYYY-MM-DD")
          : row.date_prop;
        row.tanggal_faktur_pajak = row.tanggal_faktur_pajak
          ? moment(row.tanggal_faktur_pajak, "YYYY-MM-DD").format("YYYY-MM-DD")
          : row.tanggal_faktur_pajak;
        row.tanggal_invoice = row.tanggal_invoice
          ? moment(row.tanggal_invoice, "YYYY-MM-DD").format("YYYY-MM-DD")
          : row.tanggal_invoice;
        row.tanggal_posting = row.tanggal_posting
          ? moment(row.tanggal_posting, "YYYY-MM-DD").format("YYYY-MM-DD")
          : row.tanggal_posting;
        row.updated = row.updated
          ? moment(row.updated, "YYYY-MM-DD").format("YYYY-MM-DD")
          : row.updated;
        let region_desc = klaimdetail1[0].region_id;
        let sqlgetregionid = `SELECT * FROM r_region WHERE kode = '${region_desc}'`;
        let dataregion = await request.query(sqlgetregionid);
        let sqlgetregionidbydistributor = `SELECT * FROM r_region WHERE kode = '${row.kode_region}'`;
        let dataregionbydistributor = await request.query(
          sqlgetregionidbydistributor
        );

        let nama_region =
          dataregion.recordset.length > 0
            ? dataregion.recordset[0].nama
            : dataregionbydistributor.recordset.length > 0
            ? dataregionbydistributor.recordset[0].nama
            : "";
        row.nama_region = nama_region;

        let getUrl = ` SELECT url_tanda_terima FROM klaim k WHERE klaim_id =  '${row.klaim_id}' `;
        let isiUrl = await request.query(getUrl);
        let urlTandaTerima = isiUrl.recordset;
        row.url = urlTandaTerima;

        // row.prg = dts;
        // console.log(row);

        let total_sales_amount = 0;
        let total_accounting_amount = 0;

        for (let i = 0; i < row.lines.length; i++) {
          let sales_amount = row.lines[i].sales_amount;
          total_sales_amount = total_sales_amount + sales_amount;

          let total_klaim = row.lines[i].total_klaim;
          total_accounting_amount = total_accounting_amount + total_klaim;
        }

        row.sales_approve_amount = total_sales_amount;
        return res.success({
          result: row,
          message: "Fetch data successfully",
        });
      });
    } catch (err) {
      return res.error(err);
    }
  },
  getKlaim: async function (req, res) {
    const {
      query: { nomoreprop, soldto, m_user_id },
    } = req;
    // console.log(req.query);
    await DB.poolConnect;

    try {
      const requestuserproposal = await DBPROP.promise();
      const request = DB.pool.request();

      let nomoreprop_param = nomoreprop.trim();

      // LOCK NOMOR PROPOSAL

      let sqlGetNomorProposalLock = `SELECT COUNT(1) AS jumlahData FROM data_eprop_lock WHERE nomor_proposal = '${nomoreprop_param}'`;

      // console.log(sqlGetCekApakahNomorProposalSedangDigunakan);

      let getJumlahNomorProposalData = await request.query(
        sqlGetNomorProposalLock
      );

      let jumlahDataNomorProposal = getJumlahNomorProposalData.recordset.length > 0 ? getJumlahNomorProposalData.recordset[0].jumlahData : 0;


      // PROSES PENGECEKAN KUNCI NOMOR PROPOSAL

      let sqlGetCekApakahNomorProposalSedangDigunakan = `SELECT COUNT(1) AS jumlahData FROM lock_eprop_klaim WHERE nomor_proposal = '${nomoreprop_param}' 
      AND islock = 'Y' AND m_user_id <> '${m_user_id}'`;

      // console.log(sqlGetCekApakahNomorProposalSedangDigunakan);

      let getJumlahData = await request.query(
        sqlGetCekApakahNomorProposalSedangDigunakan
      );
      let jumlahData =
        getJumlahData.recordset.length > 0
          ? getJumlahData.recordset[0].jumlahData
          : 0;

      // console.log('jumlahData',jumlahData);
      // return res.success({
      //   error : true,
      //   message: "Modul Klaim Saat Ini Sedang Maintenance akan dibuka pada kembali tanggal 23 November 2022"
      // });

      if (jumlahData > 0) {
        return res.success({
          error: true,
          message:
            "Nomor Klaim Sedang dalam proses antrian klaim oleh distributor lain harap menunggu maksimal 10 menit kedepan terimakasih",
        });
      }else if(jumlahDataNomorProposal > 0){
        return res.success({
          error: true,
          message:
            `Periode Proposal ${nomoreprop} Tidak diizinkan karena batas akhir pengajuan 31 Juli 2023`,
        });
      } else {
        // PROSES LOCK DULU

        let inserDataLock = `INSERT INTO lock_eprop_klaim
        (nomor_proposal, m_user_id)
        VALUES('${nomoreprop_param}', '${m_user_id}')`;
        await request.query(inserDataLock);

        let querygetfinishdate = `SELECT * FROM v_getexpiredproposal WHERE doc_no = '${nomoreprop_param}'`;
        // console.log("querygetfinishdate >> ", querygetfinishdate);
        let getfinishdate = await requestuserproposal.query(querygetfinishdate);
        let bulan =
          getfinishdate[0].length > 0 ? getfinishdate[0][0].bulan : null;
        let tahun =
          getfinishdate[0].length > 0 ? getfinishdate[0][0].budget_year : null;
        // console.log("bulan >>>> ", bulan);
        // console.log("tahun >>>> ", tahun);

        if (!bulan || !tahun) {
          return res.success({
            error: true,
            message: "Nomor E-Proposal tidak valid",
          });
        }

        let start_date = moment(
          tahun.toString().concat("-").concat(padnumber(bulan)),
          "YYYY-MM"
        )
          .endOf("month")
          .format("YYYY-MM-DD");
        // console.log('periodeEprop ',start_date);

        let sqlgetkodeshipto = `SELECT kode FROM m_distributor_v WHERE kode_pajak='${soldto}'`;
        let datashipto = await request.query(sqlgetkodeshipto);

        //console.log("masuk 2");
        let datashiptolist = datashipto.recordset.map(function (item) {
          return item["kode"];
        });

        let valueIN = "";
        for (const datas of datashiptolist) {
          valueIN += ",'" + datas + "'";
        }

        valueIN = valueIN.substring(1);

        //console.log('datashiptolist ',valueIN);

        let sqlgetData = `SELECT a.proposal_id,b.proposal_budget_id,a.doc_no,a.title ,
        proposal_date, a.division_code,a.region_id ,d.region_desc ,e.status_name 
        ,b.branch_code, b.branch_code as branch_desc ,ma.activity_desc,a.company_code ,
        b.brand_code as brand_desc ,total_realisasi ,avg_sales,c.company_desc,
        g.division_sap,
        CASE WHEN (a.company_code = 'HI' AND a.budget_year = '2020') THEN '11000'
        WHEN (a.company_code = 'SEI' AND a.budget_year = '2020') THEN '120000'
        WHEN (a.company_code = 'MI') THEN '210000' 
        ELSE '210000'
        END
        as profit_center,ma.activity_code ,a.budget_year ,
        start_date, end_date,monthname(str_to_date(b.bulan,'%m')) as bulan_desc,
        DATE_ADD(end_date, INTERVAL 2 MONTH) finish,
        DATE_ADD(end_date, INTERVAL 14 MONTH) finish_mt,
        CASE WHEN nilai_so > 0 THEN nilai_so else b.budget end budget,
        a.islock AS islock 
        FROM proposal a 
        JOIN proposal_budget b ON a.proposal_id = b.proposal_id 
        JOIN m_activity ma ON ma.activity_code = b.activity_id  AND ma.company_desc = a.company_code AND ma.year = a.budget_year
        JOIN m_company c ON c.company_code = a.company_code 
        JOIN m_region d ON d.region_id = a.region_id 
        JOIN m_status e ON e.status_id = a.status_id 
        JOIN m_division g ON g.division_code = a.division_code AND g.company_desc = a.company_code 
        WHERE a.doc_no = '${nomoreprop_param}'  AND a.status_id = 30
        ORDER BY a.proposal_date desc`;

        console.log(">>>>>>>>>>>>>>>>>>>>>>>>>>>>>> ", sqlgetData);
        
        let dataproposal = await requestuserproposal.query(sqlgetData);
        let dataklaim = dataproposal[0];
        let dataklaimHead = dataproposal[0][0];

        if (dataklaim.length > 0) {
          //let data = response.data;

          let lockData = dataklaimHead.islock;

          if (lockData == "Y") {
            return res.success({
              error: true,
              message: "Nomor E-Proposal Lock By System",
            });
          }

          // COBA MENGGUNAKAN QUERY
          let arrayLines = [];

          let data = {
            proposal_id: dataklaimHead.proposal_id,
            no_doc: dataklaimHead.doc_no,
            title: dataklaimHead.title,
            budget_awal_bgt: dataklaimHead.budget_awal,
            date_prop: dataklaimHead.proposal_date,
            divisi: dataklaimHead.division_code,
            comp: dataklaimHead.company_desc,
            region: dataklaimHead.region_desc,
            status: dataklaimHead.status_name,
            start_date: dataklaimHead.start_date,
            end_date: dataklaimHead.end_date,
            cost_center: dataklaimHead.division_sap,
            profit_center: dataklaimHead.profit_center,
            company_code: dataklaimHead.company_code,
            region_id: dataklaimHead.region_id,
            budget_year: dataklaimHead.budget_year,
            finish: dataklaimHead.finish,
            finish_mt: dataklaimHead.finish_mt,
          };

          let hitungbudgetawal = 0;
          for (let i = 0; i < dataklaim.length; i++) {
            hitungbudgetawal = hitungbudgetawal + dataklaim[i].budget;

            let no_proposal = dataklaim[i].doc_no;
            let comp_id = dataklaim[i].profit_center;
            let company = dataklaim[i].company_code;
            let budget_id = dataklaim[i].proposal_budget_id;
            let branch_code = dataklaim[i].branch_code;
            let branch_desc = dataklaim[i].branch_desc;
            let activity = dataklaim[i].activity_desc;
            let title = dataklaim[i].title;
            let brand = dataklaim[i].brand_desc;
            let activity_code = dataklaim[i].activity_code;
            let budget = dataklaim[i].budget;
            let region = dataklaim[i].region_id;
            let date_prop = dataklaim[i].proposal_date;
            let profitcenter = dataklaim[i].profit_center;
            let cost_center = dataklaim[i].division_sap;
            let divisi = dataklaim[i].division_code;
            let budget_awal = 0;
            let bulan_desc = dataklaim[i].bulan_desc;

            arrayLines.push({
              no_proposal: no_proposal,
              comp_id: comp_id,
              company: company,
              budget_id: budget_id,
              branch_code: branch_code,
              branch_desc: branch_desc,
              activity: activity,
              title: title,
              brand: brand,
              activity_code: activity_code,
              budget: budget,
              region: region,
              date_prop: date_prop,
              profitcenter: profitcenter,
              cost_center: cost_center,
              divisi: divisi,
              budget_awal: budget_awal,
              bulan_desc: bulan_desc,
            });
          }

          // console.log(arrayLines);
          data.line = arrayLines;
          data.budget_awal_bgt = hitungbudgetawal;

          let sqlgetdatacostcenter = `SELECT r_costcenter_id FROM r_costcenter WHERE kode='${data.cost_center}'`;
          let datacostcenter = await request.query(sqlgetdatacostcenter);
          let r_costcenter_id =
            datacostcenter.recordset.length > 0
              ? datacostcenter.recordset[0].r_costcenter_id
              : null;
          let tahun_proposal = data.budget_year;
          if (tahun_proposal == "2020") {
            return res.success({
              error: true,
              message: "Periode Proposal 2020 Tidak diizinkan",
            });
          } else if (tahun_proposal == "2021") {
            //console.log("dsakndasid");
            return res.success({
              error: true,
              message:
                "Periode Proposal 2021 Tidak diizinkan karena batas akhir pengajuan 28 Februari 2022",
            });
          } else if (tahun_proposal == "2022") {
            //console.log("dsakndasid");
            return res.success({
              error: true,
              message:
                "Batas Periode Klaim Aktivitas Promosi Tahun 2022 Sudah Berakhir. ",
            });
          } else if (
            nomoreprop_param == "081656/MI/GT/FEB/2023" ||
            nomoreprop_param == "081659/MI/GT/FEB/2023" ||
            nomoreprop_param == "081658/MI/GT/FEB/2023" ||
            nomoreprop_param == "081655/MI/GT/FEB/2023" ||
            nomoreprop_param == "081751/MI/GT/FEB/2023" ||
            nomoreprop_param == "082763/MI/MM/FEB/2023" ||
            nomoreprop_param == "081640/MI/PHAR/FEB/2023" ||
            nomoreprop_param == "081642/MI/B2B/FEB/2023"
          ) {
            //console.log("dsakndasid");
            return res.success({
              error: true,
              message:
                "Batas Periode Klaim Aktivitas Promosi Tahun 2022 Sudah Berakhir, E Proposal Pengganti 2023 Tidak Dapat Dipergunakan.",
            });
          }

          //console.log("MASUK 3");
          // console.log("Channelnya :",data.divisi);
          // console.log("tahun proposal",tahun_proposal);
          if (tahun_proposal == "2021") {
            let today = moment().format("YYYY-MM-DD");
            if (today >= "2022-03-01" && today <= "2022-05-31") {
              // console.log("pengajuan", today);
              if (
                tahun_proposal == "2021" &&
                ((data.divisi == "MT" && data.divisi == "GT") ||
                  data.divisi == "PHAR" ||
                  data.divisi == "B2B" ||
                  data.divisi == "ECOM")
              ) {
                //console.log("MASUK 5");
                return res.success({
                  error: true,
                  message:
                    "Periode Proposal 2021 Tidak diizinkan karena melebihi batas akhir pengajuan ",
                });
              }
            } else if (tahun_proposal == "2021") {
              //console.log("sacs");
              // console.log("pengajuan >>> ", today);
              return res.success({
                error: true,
                message:
                  "Periode Proposal 2021 Tidak diizinkan karena batas akhir pengajuan 31 Mei 2022",
              });
            }
          }

          // console.log("DIVISI ", data.divisi);
          // console.log(
          //   "OLD >>>  ",
          //   moment(start_date, "YYYY-MM-DD").format("YYYY-MM-DD")
          // );
          // console.log(
          //   "NEW >>>  ",
          //   moment(start_date, "YYYY-MM-DD").add(2, "M").format("YYYY-MM-DD")
          // );
          let finish_gt = moment(start_date, "YYYY-MM-DD")
            .add(2, "M")
            .add(1, "days")
            .format("YYYY-MM-DD");

          let finish_mt = moment(start_date, "YYYY-MM-DD")
            .add(15, "M")
            .add(1, "days")
            .format("YYYY-MM-DD");

          // Di tutup karna tidak ada validasi ini
          // Validasi eprop 2 bulan
          let today = moment().format("YYYY-MM-DD");
          // console.log("TODAYY ?????? ", today);
          // console.log("finish_gt ?????? ", finish_gt);
          // console.log("finish_mt ?????? ", finish_mt);
          // console.log("data.date_prop >> ", data.date_prop);

          // console.log(
          //   "daskldnalsn ?? ",
          //   moment(data.date_prop, "YYYY-MM-DD").format("YYYY-MM-DD")
          // );

          if (
            Math.floor(new Date(data.date_prop) / 1000) >=
            Math.floor(new Date(`2021-04-01`) / 1000)
          ) {
            // console.log("LOLOS TANGGAL PROPOSAL >=  2021-04-01 ");

            if (data.divisi !== `MT` && data.divisi !== `MM`) {
              // console.log("LOLOS DIVISI BUKAN MT / MM ");
              if (today >= finish_gt) {
                // console.log(" validasi 2 bulan");
                return res.success({
                  error: true,
                  message: `Proposal ${data.divisi} Periode akhir Proposal ${finish_gt} sudah tidak bisa di klaim...`,
                });
              }
            } else {
              if (tahun_proposal == "2022") {
                return res.success({
                  error: true,
                  message:
                    "Periode Proposal 2022 Tidak diizinkan karena batas akhir pengajuan 31 Maret 2023",
                });
              }

              if (today >= finish_mt) {
                // console.log(" validasi 14 bulan");
                return res.success({
                  error: true,
                  message: `Proposal ${data.divisi} Periode akhir Proposal ${finish_mt} sudah tidak bisa di klaim...`,
                });
              }
            }
          }

          // console.log("LOLOS SMUA >>>>>>>>> ");

          let nomor_proposal = data.no_doc;

          data.nomor_proposal = data.no_doc;
          data.r_costcenter_id = r_costcenter_id;
          data.profit_center = Number(data.profit_center);

          //data.date_prop = moment(data.date_prop);
          data.company = data.comp;
          data.lines = data.line;
          let linesA = data.lines;
          let budget_awal_bgt = data.budget_awal_bgt;
          // disini pengurangan budget dari SAP
          // console.log(data.line)
          // console.log(budget_awal_bgt);
          let budgetAll = 0;
          for (let i = 0; i < data.line.length; i++) {
            budgetAll = budgetAll + parseFloat(data.line[i].budget);
            // console.log(data.line[i].budget)
          }

          // console.log(budgetAll)

          for (let i = 0; i < linesA.length; i++) {
            linesA[i].nomor_proposal = linesA[i].no_proposal;
            linesA[i].budget_awal_bgt = budget_awal_bgt;
            delete linesA[i].no_proposal;
          }

          delete data.respone;
          delete data.line;
          delete data.comp;
          delete data.no_doc;
          try {
            let sqlHasKlaim = `SELECT
          kd.budget_id, kd.branch_code, kd.branch_desc, kd.activity, kd.brand,
          SUM(CASE WHEN k.kode_status='DR' THEN kd.total_klaim WHEN k.kode_status='RJF' THEN 0 ELSE kd.total_klaim END) AS total_klaim, 
          kd.activity_code,
          kd.nomor_proposal, kd.divisi, kd.cost_center, 
          kd.profit_center, kd.region_id, kd.company_code, kd.date_prop, kd.comp_id, kd.title
          FROM klaim_detail kd,klaim k WHERE k.klaim_id = kd.klaim_id
          AND kd.nomor_proposal='${nomor_proposal}'
          AND k.isactive='Y'
          GROUP BY
          kd.budget_id, kd.branch_code, kd.branch_desc, kd.activity, kd.brand,
          kd.activity_code,
          kd.nomor_proposal, kd.divisi, kd.cost_center, 
          kd.profit_center, kd.region_id, kd.company_code, kd.date_prop, kd.comp_id, kd.title`;
          
          console.log(sqlHasKlaim,">>>>>>>>>>>>>>>>>>>>>>>>>>>>>>");
            let getdatahasklaim = await request.query(sqlHasKlaim);

            let linesB = getdatahasklaim.recordset;
            console.log("linesA ", linesA);
            console.log("linesB ", linesB);

            if (linesB.length > 0) {
              var merged = _.merge(
                _.keyBy(linesA, "budget_id"),
                _.keyBy(linesB, "budget_id")
              );
              var values = _.values(merged);

              // console.log(values);

              for (let i = 0; i < values.length; i++) {
                // console.log(values[i].budget);
                var valuesB = linesB.filter(
                  (e) => e.budget_id == values[i].budget_id
                );

                //console.log(valuesB.length);

                let totalKlaim = 0;
                for (let j = 0; j < valuesB.length; j++) {
                  totalKlaim = totalKlaim + valuesB[j].total_klaim;
                }

                //console.log('budget_id ',values[i].budget_id);

                values[i].budget_awal = Number(values[i].budget);
                values[i].budget =
                  Number(values[i].budget) -
                  totalKlaim -
                  Number(
                    values[i].reverse_amount ? values[i].reverse_amount : 0
                  );
              }
            } else {
              for (let i = 0; i < linesA.length; i++) {
                linesA[i].budget = Number(linesA[i].budget);
                linesA[i].budget_awal = Number(linesA[i].budget);
              }

              data.lines = linesA;
              // console.log('data.lines linesA',data.lines );
            }

            //console.log('data.lines ',data.lines);
            //console.log(linesA);
            //console.log(linesB);
            // filter data hanya yang belum closed
            let dataclosed = data.lines.filter((e) => e.isclosed === true);
            //data.lines = data.lines.filter(o1 => !dataclosed.some(o2 => o1.budget_id === o2.budget_id));
            data.lines = data.lines.filter(
              (o1) =>
                !dataclosed.some(
                  (o2) => o1.nomor_proposal === o2.nomor_proposal
                )
            );
            let budgetlimit = data.lines.filter((e) => e.budget > 0);
            data.lines = budgetlimit;
            //console.log(data.lines);
            //console.log(data);
            // console.log('budgetlimit ',budgetlimit);

            //console.log(budgetlimit);

            if (budgetlimit.length == 0) {
              return res.success({
                error: true,
                message: "Budget E-Proposal habis",
              });
            }

            // console.log('data.lines ',data.lines);
            let jenis_klaim = "NON INFRA";
            for (let i = 0; i < data.lines.length; i++) {
              let sqlgetdatabranchcode = `SELECT * FROM m_branch_prop WHERE branch_code='${data.lines[i].branch_code}'`;
              //console.log('masuk query',sqlgetdatabranchcode);
              let databranchdesc = await request.query(sqlgetdatabranchcode);
              let branch_desc =
                databranchdesc.recordset.length > 0
                  ? databranchdesc.recordset[0].branch_desc
                  : null;
              data.lines[i].branch_desc = branch_desc;
              let querygetklaimterpakai = `SELECT CASE WHEN k.kode_status='DR' 
              THEN SUM(kd.total_klaim) ELSE SUM(kd.total_klaim) END AS budget_terpakai 
              FROM klaim k,klaim_detail kd WHERE 
              k.klaim_id = kd.klaim_id AND kd.budget_id = '${data.lines[i].budget_id}'
              AND k.kode_status <> 'RJF'
              AND k.isactive ='Y'
              GROUP BY k.kode_status`;
              //console.log(querygetklaimterpakai);

              let dataklaimterpakai = await request.query(
                querygetklaimterpakai
              );
              let budget_terpakai = 0;
              for (let j = 0; j < dataklaimterpakai.recordset.length; j++) {
                budget_terpakai =
                  budget_terpakai +
                  dataklaimterpakai.recordset[j].budget_terpakai;
              }

              let querygetreverseamount = `SELECT reverse_amount FROM proposal_reverse WHERE proposal_budget_id = '${data.lines[i].budget_id}'`;
              let getreverseamount = await requestuserproposal.query(
                querygetreverseamount
              );
              let reverseAmount =
                getreverseamount[0].length > 0
                  ? getreverseamount[0][0].reverse_amount
                  : 0;

              data.lines[i].budget_terpakai = budget_terpakai;
              data.lines[i].reverse_amount = Number(reverseAmount);


              // AMBIL DATA KLAIM MANUAL

            
              let queryGetKlaimManual = `SELECT nilai_klaim_manual FROM data_klaim_manual 
              WHERE proposal_budget_id = '${data.lines[i].budget_id}'`;
              let getDataKlaimManual = await request.query(queryGetKlaimManual);
              let dataKlaimManual = getDataKlaimManual.recordset.length > 0 ? getDataKlaimManual.recordset[0].nilai_klaim_manual : 0;

              data.lines[i].klaim_manual_amount = Number(dataKlaimManual);


              // AMBIL DATA PO

              let queryGetKlaimPo = `SELECT nilai_gr  FROM data_po_eprop WHERE proposal_budget_id = '${data.lines[i].budget_id}'`;
              console.log(queryGetKlaimPo,"cek sejauh mana");
              let getDataKlaimPo = await request.query(queryGetKlaimPo);
              let dataKlaimPo = getDataKlaimPo.recordset.length > 0 ? getDataKlaimPo.recordset[0].nilai_gr : 0;

              data.lines[i].po_amount = Number(dataKlaimPo);

              console.log('data.lines[i].budget_awal ',data.lines[i].budget_awal);
              console.log('data.lines[i].budget_terpakai ',data.lines[i].budget_terpakai);
              console.log('data.lines[i].reverse_amount ',data.lines[i].reverse_amount);
              console.log('data.lines[i].klaim_manual_amount ',data.lines[i].klaim_manual_amount);
              console.log('data.lines[i].po_amount ',data.lines[i].po_amount);

              data.lines[i].budget =
                data.lines[i].budget_awal -
                data.lines[i].budget_terpakai -
                data.lines[i].reverse_amount -
                data.lines[i].klaim_manual_amount -
                data.lines[i].po_amount;

              // console.log(data.lines[i].budget);
              delete data.lines[i].total_klaim;
              if (
                data.lines[i].activity_code == "6132021009" ||
                data.lines[i].activity_code == "6132022010" ||
                data.lines[i].activity_code == "6132031008" ||
                data.lines[i].activity_code == "6132142001" ||
                data.lines[i].activity_code == "6132052004"
              ) {
                jenis_klaim = "INFRA";
              }
              // console.log(data.lines[i].activity_code,`xxxxxx`);
            }
            // console.log(jenis_klaim);
            data.jenis_klaim = jenis_klaim;
            data.lines = data.lines.filter((e) => e.budget > 0);
            console.log(data,"cek nyampe ngga");
            console.log(data.lines.length,"cek aja");


            if (data.lines.length == 0) {
              return res.success({
                error: true,
                message: "Budget E-Proposal habis Karena sudah direverse",
              });
            }

            return res.success({
              result: data,
              message: "Fetch data successfully",
            });
          } catch (err) {
            return res.error(err);
          }
        } else {
          return res.success({
            error: true,
            message: "Nomor E-Proposal tidak valid",
          });
        }
      }
    } catch (err) {
      return res.error(err);
    }
  },
  new: async function (req, res) {
    const {
      m_user_id,
      nomor_proposal,
      file_invoice,
      file_surat_klaim_sesuai_prinsiple,
      file_faktur_pajak,
      file_eproposal,
      file_ktp,
      file_rekap_klaim,
      file_copy_faktur,
      file_skp,
      jenis_klaim,
      nomor_ktp,
      nama_ktp,
      nomor_npwp,
      nama_npwp,
      nomor_faktur,
      tipe_pajak,
      tanggal_faktur_pajak,
      company_code,
      total_klaim,
      nominal_pajak,
      nominal_claimable,
      perihal_klaim,
      tanggal_invoice,
      m_distributor_id,
      invoice,
      periode_klaim,
      file_program,
      lines,
    } = JSON.parse(req.body.document);

    await DB.poolConnect;

    const request = DB.pool.request();
    // console.log(lines);
    let totalKlaim = 0;
    // let totalBudgetAwal = 0;
    let budget = [];

    // console.log("masuk sini.................", jenis_klaim);
    // return res.error(err);
    let nomor_ktp_text = nomor_ktp;
    let nama_ktp_text = nama_ktp;
    let nomor_npwp_text = nomor_npwp;
    let nama_npwp_text = nama_npwp;
    let nomor_faktur_text = nomor_faktur;
    let invoice_text = invoice;
    let periode_klaim_text = periode_klaim;

    nomor_ktp_text = nomor_ktp_text
      .replace(/'/g, `''`)
      .replace(/"/g, `""`)
      .replace(/\\/g, `\\`);
    nama_ktp_text = nama_ktp_text
      .replace(/'/g, `''`)
      .replace(/"/g, `""`)
      .replace(/\\/g, `\\`);
    nomor_npwp_text = nomor_npwp_text
      .replace(/'/g, `''`)
      .replace(/"/g, `""`)
      .replace(/\\/g, `\\`);
    nomor_faktur_text = nomor_faktur_text
      .replace(/'/g, `''`)
      .replace(/"/g, `""`)
      .replace(/\\/g, `\\`);
    invoice_text = invoice_text
      .replace(/'/g, `''`)
      .replace(/"/g, `""`)
      .replace(/\\/g, `\\`);
    nama_npwp_text = nama_npwp_text
      .replace(/'/g, `''`)
      .replace(/"/g, `""`)
      .replace(/\\/g, `\\`);
    // periode_klaim_text = periode_klaim_text.replace(/'/g,`''`).replace(/"/g,`""`).replace(/\\/g,`\\`);

    // console.log("wWE ", nomor_ktp_text);
    // console.log("SDA ", nama_ktp_text);
    // console.log("SDXW ", nomor_npwp_text);
    // console.log("ZCZC ", nomor_faktur_text);
    // console.log("WFE ", invoice_text);
    // console.log("ADWD ", nama_npwp_text);
    // console.log("cekk dskmdka");
    for (let i = 0; i < lines.length; i++) {
      let databudget = {
        nomor_proposal: lines[i].nomor_proposal,
        budget_awal_bgt: lines[i].budget_awal_bgt,
      };
      totalKlaim = totalKlaim + lines[i].total_klaim;

      budget.push("MASUK GAKKK ", databudget);
    }

    let uniqueBudget = _.uniqBy(budget, "nomor_proposal");
    //console.log(uniqueBudget);
    let totalBudgetAwal = 0;
    let dataklaimterpakai = 0;
    let budgetTerakhir = 0;
    let totalSisaKlaim = 0;
    for (let i = 0; i < uniqueBudget.length; i++) {
      let nomor_proposal = uniqueBudget[i].nomor_proposal;
      totalBudgetAwal = totalBudgetAwal + uniqueBudget[i].budget_awal_bgt;

      let cekbudget = `SELECT nomor,klaim FROM sisa_klaim WHERE nomor = '${nomor_proposal}'`;
      let getKlaimSAP = await request.query(cekbudget);
      let dataSAP = getKlaimSAP.recordset;

      if (dataSAP.length > 0) {
        budgetTerakhir = dataSAP[0].klaim;
      }

      // let sqlHasKlaim = `SELECT CASE WHEN k.kode_status='DR'
      // THEN SUM(kd.total_klaim) ELSE SUM(kd.total_klaim) END AS budget_terpakai
      // FROM klaim k,klaim_detail kd WHERE
      // k.klaim_id = kd.klaim_id AND kd.nomor_proposal = '${nomor_proposal}'
      // AND k.kode_status <> 'RJF'
      // AND k.isactive ='Y'
      // GROUP BY k.kode_status`;

      let sqlHasKlaim = `SELECT
      kd.budget_id, kd.branch_code, kd.branch_desc, kd.activity, kd.brand,
      SUM(CASE WHEN k.kode_status='DR' THEN kd.total_klaim WHEN k.kode_status='RJF' THEN 0 ELSE kd.total_klaim END) AS budget_terpakai, 
      kd.activity_code,
      kd.nomor_proposal, kd.divisi, kd.cost_center, 
      kd.profit_center, kd.region_id, kd.company_code, kd.date_prop, kd.comp_id, kd.title
      FROM klaim_detail kd,klaim k WHERE k.klaim_id = kd.klaim_id
      AND kd.nomor_proposal='${nomor_proposal}' AND k.kode_status <> 'RJF'
      AND k.isactive= 'Y'
      GROUP BY
      kd.budget_id, kd.branch_code, kd.branch_desc, kd.activity, kd.brand,
      kd.activity_code,
      kd.nomor_proposal, kd.divisi, kd.cost_center, 
      kd.profit_center, kd.region_id, kd.company_code, kd.date_prop, kd.comp_id, kd.title`;

      let getdatahasklaim = await request.query(sqlHasKlaim);
      dataklaimterpakai =
        getdatahasklaim.recordset.length > 0
          ? getdatahasklaim.recordset[0].budget_terpakai
          : 0;
    }
    totalSisaKlaim =
      totalBudgetAwal - totalKlaim - dataklaimterpakai - budgetTerakhir;

    // console.log('totalKlaim ',totalKlaim);
    // console.log('totalBudgetAwal ',totalBudgetAwal);
    // console.log('budgetTerakhirDariSAP ',budgetTerakhir);
    // console.log('dataklaimterpakai ',dataklaimterpakai);
    // console.log('totalSisaKlaim ',totalSisaKlaim);

    let message = `Budget tidak mencukupi untuk diklaim 
                  Budget Awal : ${totalBudgetAwal} - 
                  Total Klaim : ${totalKlaim} - 
                  Klaim Terpakai(E-Sales) : ${dataklaimterpakai} - 
                  Klaim terpakai (SAP) : ${budgetTerakhir}
                  Sisa Klaim = ${totalSisaKlaim}`;

    // let cekOutlet = `SELECT * FROM outlet_klaim WHERE kode_alias = '${m_user_id}'`;
    // let dcek = await request.query(cekOutlet);
    // if(dcek.recordset.length > 0){
    //     console.log(cekOutlet);
    // }

    // return  res.error("xxxxxxxxx");

    if (totalSisaKlaim < 0) {
      //console.log('zz', message);
      //perlakukan sebagaimana mestinya formdata, meski ujung2nya return error,
      var uploadFile = req.file("file");
      uploadFile.upload({}, async function onUploadComplete(err, files) {
        return res.error({
          message: message,
        });
      });
    } else {
      const generatedID = uuid();
      var uploadFile = req.file("file");
      //console.log(uploadFile);
      uploadFile.upload(
        { maxBytes: 500000000000000 },
        async function onUploadComplete(err, files) {
          if (err) {
            let errMsg = err.message;
            //console.log(errMsg);
            let sqllog = `INSERT INTO log_error
                  (createdby,updatedby, error,menu,klaim_id)
                  VALUES('${m_user_id}','${m_user_id}', '${err}','KLAIM','${generatedID}')`;
            await request.query(sqllog);

            let sqlupdateKlaim = `UPDATE klaim
                  SET isactive='N',updated=getdate() WHERE klaim_id='${generatedID}'`;
            await request.query(sqlupdateKlaim);

            return res.error(errMsg);
          }

          for (const file of files) {
            //console.log('filename', file.filename)
            fs.mkdirSync(dokumentPath("klaimproposal", generatedID), {
              recursive: true,
            });

            const filesamaDir = glob.GlobSync(
              path.resolve(
                dokumentPath("klaimproposal", generatedID),
                file.filename.replace(/\.[^/.]+$/, "")
              ) + "*"
            );
            if (filesamaDir.found.length > 0) {
              //console.log('isexist file nama sama', filesamaDir.found[0])
              fs.unlinkSync(filesamaDir.found[0]);
            }
            fs.renameSync(
              file.fd,
              path.resolve(
                dokumentPath("klaimproposal", generatedID),
                file.filename
              )
            );
          }
          //kode INSERT ke db
          try {
            // console.log("TEST");
            let sqlgetdistributor = `SELECT * FROM m_distributor_v mdv WHERE mdv.m_distributor_id = '${m_distributor_id}'`;
            let datadistributor = await request.query(sqlgetdistributor);

            let kode_distributor = datadistributor.recordset[0].kode;
            let kode_pajak = datadistributor.recordset[0].kode_pajak;
            let m_pajak_id = datadistributor.recordset[0].m_pajak_id;
            let kode_region_ = datadistributor.recordset[0].kode_region;
            let kode_channel_ =
              datadistributor.recordset[0].r_distribution_channel_id;

            let sqlgetpajak = `SELECT mp.m_pajak_id,ro.nama,ro.r_organisasi_id,
              mp.r_distribution_channel_id FROM m_pajak_v mp,r_organisasi ro 
              WHERE mp.m_pajak_id = '${m_pajak_id}'
              AND ro.r_organisasi_id = mp.r_organisasi_id`;
            //console.log(sqlgetpajak);
            let datapajak = await request.query(sqlgetpajak);

            let nama_pemohon = datadistributor.recordset[0].nama;
            let r_organisasi_id = datapajak.recordset[0].r_organisasi_id;
            let r_distribution_channel_id =
              datadistributor.recordset[0].r_distribution_channel_id;

            let perihalklaim = ``;
            if (perihal_klaim) {
              perihalklaim = perihal_klaim;
              perihalklaim = perihalklaim
                .replace(/'/g, `''`)
                .replace(/"/g, `""`)
                .replace(/\\/g, `\\`);
              perihalklaim = `'${perihalklaim}'`;
            } else {
              perihalklaim = `NULL`;
            }

            let tanggalfakturpajak = ``;
            if (tanggal_faktur_pajak) {
              tanggalfakturpajak = `'${tanggal_faktur_pajak}'`;
            } else {
              tanggalfakturpajak = `NULL`;
            }

            let sqlgetdocumentno = `SELECT document_number_id FROM document_number WHERE kode = 'KLAIM'`;

            let getdocument = await request.query(sqlgetdocumentno);
            let document_number_id =
              getdocument.recordset.length > 0
                ? getdocument.recordset[0].document_number_id
                : "";

            // let queryDataTable = `
            // SELECT COUNT(1) + 1 AS totalrows FROM document_number dn,document_number_line dnl
            // WHERE dn.document_number_id='${document_number_id}'
            // AND dn.document_number_id = dnl.document_number_id
            // AND dnl.r_organisasi_id = '${r_organisasi_id}'`;

            //let queryDataTable = `SELECT TOP 1 nomor_klaim FROM klaim WHERE m_pajak_id='${m_pajak_id}' ORDER BY nomor_klaim DESC`;
            let queryDataTable = `SELECT COUNT(1) AS nomor_klaim FROM klaim k`;
            let getsequence = await request.query(queryDataTable);
            const row = getsequence.recordset[0];
            //let linenumber = getsequence.recordset.length > 0 ? (Number(row.nomor_klaim.split('/')[4]) + 1000) : 1000;
            let linenumber = row.nomor_klaim;
            let totalrows = pad(linenumber);
            let bulan = moment(tanggal_invoice, "YYYY-MM-DD").format("MMM");
            let tahun = moment(tanggal_invoice, "YYYY-MM-DD").format("YYYY");

            let nomor_dokumen_klaim =
              tahun +
              "/PROP/" +
              bulan.toLocaleUpperCase() +
              "/" +
              kode_pajak +
              "/" +
              kode_distributor +
              "/" +
              totalrows;

            let status = `Pengajuan`;
            let kode_status = `DR`;
            let sql = `INSERT INTO klaim
              (klaim_id,
              createdby,
              updatedby,
              nomor_klaim, 
              status, 
              file_invoice, 
              file_surat_klaim_sesuai_prinsiple, 
              file_faktur_pajak, 
              file_eproposal, 
              file_ktp, 
              file_rekap_klaim, 
              file_copy_faktur, 
              file_skp, 
              nomor_ktp, 
              nama_ktp, 
              nomor_npwp, 
              nama_npwp, 
              nomor_faktur, 
              tipe_pajak, 
              tanggal_faktur_pajak, 
              company_list, 
              total_klaim,
              asdh_approve_amount,
              sales_approve_amount,
              accounting_approve_amount,
              nominal_pajak, 
              nominal_claimable, 
              perihal_klaim, 
              kode_status,
              tanggal_invoice,
              m_pajak_id,
              m_distributor_id,
              invoice,
              jenis_klaim,
              periode_klaim,
              file_program
              )
              VALUES(
                  '${generatedID}',
                  '${m_user_id}',
                  '${m_user_id}',
                  '${nomor_dokumen_klaim}',
                  '${status}',
                  '${file_invoice}',
                  '${file_surat_klaim_sesuai_prinsiple}',
                  '${file_faktur_pajak}',
                  '${file_eproposal}',
                  '${file_ktp}',
                  '${file_rekap_klaim}',
                  '${file_copy_faktur}',
                  '${file_skp}',
                  '${nomor_ktp_text}',
                  '${nama_ktp_text}',
                  '${nomor_npwp_text}',
                  '${nama_npwp_text}',
                  '${nomor_faktur_text}',
                  '${tipe_pajak}',
                  ${tanggalfakturpajak},
                  '${company_code}',
                  ${total_klaim},
                  ${total_klaim},
                  ${total_klaim},
                  ${total_klaim},
                  '${nominal_pajak}', 
                  '${nominal_claimable}', 
                  ${perihalklaim}, 
                  '${kode_status}',
                  '${tanggal_invoice}',
                  '${m_pajak_id}',
                  '${m_distributor_id}',
                  '${invoice}','${jenis_klaim}',
                  '${periode_klaim_text}',
                  '${file_program}'
              )`;
            console.log(sql);

            request.query(sql, async (err, result) => {
              if (err) {
                let sqllog = `INSERT INTO log_error
                          (createdby,updatedby, error,menu,klaim_id)
                          VALUES('${m_user_id}','${m_user_id}', '${err}','KLAIM','${generatedID}')`;
                await request.query(sqllog);

                let sqlupdateKlaim = `UPDATE klaim
                          SET isactive='N',updated=getdate() WHERE klaim_id='${generatedID}'`;
                await request.query(sqlupdateKlaim);

                return res.error(err);
              }

              let listActivity = [];
              let totalKlaimHeader = 0;
              for (let i = 0; i < lines.length; i++) {
                totalKlaimHeader =
                  totalKlaimHeader + Number(lines[i].total_klaim);
                let budget_id = lines[i].budget_id;
                let branch_code = lines[i].branch_code;
                let branch_desc = lines[i].branch_desc;
                let activity = lines[i].activity;
                let activity_code = lines[i].activity_code;
                let brand = lines[i].brand.replace(/'/g, "");
                let budget = Number(lines[i].budget);
                let budget_awal_bgt = Number(lines[i].budget_awal_bgt);
                let total_klaim = Number(lines[i].total_klaim);
                let outstanding_klaim = Number(lines[i].outstanding_klaim);
                let ischecked = lines[i].ischecked;
                let nomor_proposal = lines[i].nomor_proposal;
                let comp_id = lines[i].comp_id;
                let company_code = lines[i].company;
                let title = lines[i].title.replace(/'/g, "");
                let region = lines[i].region;
                let date_prop = lines[i].date_prop;
                let profitcenter = lines[i].profitcenter;
                let divisi = lines[i].divisi;
                let cost_center = lines[i].cost_center;

                if (ischecked && total_klaim > 0) {
                  let queryInsertLines = `INSERT INTO klaim_detail
                            (createdby, updatedby, klaim_id, budget_id, branch_code, 
                            branch_desc, activity, brand, budget,total_klaim,
                            asdh_amount,sales_amount,accounting_amount,
                            outstanding_klaim,
                            activity_code,nomor_proposal,
                            divisi,
                            cost_center,
                            profit_center,
                            region_id,
                            company_code,
                            date_prop,
                            comp_id,
                            title,
                            budget_awal,
                            budget_id_awal,
                            nomor_proposal_awal
                            )
                            VALUES('${m_user_id}','${m_user_id}', '${generatedID}', 
                            '${budget_id}', '${branch_code}', '${branch_desc}', 
                            '${activity}', '${brand}', ${budget},${total_klaim},
                            ${total_klaim},${total_klaim},${total_klaim},${outstanding_klaim},
                            '${activity_code}','${nomor_proposal}','${divisi}',
                            '${cost_center}',
                            '${profitcenter}',
                            '${region}',
                            '${company_code}',
                            '${date_prop}',
                            '${comp_id}',
                            '${title}',
                            ${budget_awal_bgt},'${budget_id}','${nomor_proposal}'
                            )`;

                  console.log("Query INSERT detail ", queryInsertLines);
                  await request.query(queryInsertLines);
                  listActivity.push(activity);

                  // PROSES DELETE LOCK PROSES KLAIM
                  let sqlDeleteDataLockKlaim = `DELETE FROM lock_eprop_klaim 
                            WHERE nomor_proposal = '${nomor_proposal}' AND m_user_id = '${m_user_id}'`;
                  await request.query(sqlDeleteDataLockKlaim);
                }
              }

              // INSERT notifikasi
              let user_klaim = `SELECT * FROM m_role_sales mrs WHERE kode_region = '${kode_region_}'`;
              let res_ = await request.query(user_klaim);
              res_ = res_.recordset;

              if (res_.length > 0) {
                for (let z = 0; z < res_.length; z++) {
                  let m_user_id_ = res_[z].m_user_id;
                  let insertnotify = `INSERT INTO notifikasi_klaim (klaim_id,r_distribution_channel_id,kode_region,kode_status,status,is_proses,createddate,updateddate,m_user_id)
                            VALUES ('${generatedID}','${kode_channel_}','${kode_region_}','DR','Pengajuan',0,getdate(),null,'${m_user_id_}')`;

                  console.log(insertnotify);
                  await request.query(insertnotify);
                }
              }

              let nominalPajakHeader = 0;
              if (tipe_pajak == "PPN 10%") {
                nominalPajakHeader = (totalKlaimHeader * 10) / 100;
              } else if (tipe_pajak == "PPN 11%") {
                nominalPajakHeader = (totalKlaimHeader * 11) / 100;
              }

              //Memastikan nilai header sama dengan jumlah detail
              let totalNominalClaimableHeader =
                totalKlaimHeader + nominalPajakHeader;
              let updateHeader = `UPDATE klaim SET total_klaim=${totalKlaimHeader},
                      nominal_pajak=${nominalPajakHeader},
                      nominal_claimable=${totalNominalClaimableHeader} WHERE klaim_id = '${generatedID}'`;
              //console.log(updateHeader);
              await request.query(updateHeader);

              let queryDataTableKlaim = `SELECT *
                      FROM klaim_v kl 
                      WHERE kl.klaim_id ='${generatedID}'`;

              let queryDataTableKlaimDetail = `SELECT *
                      FROM klaim_detail WHERE klaim_id = '${generatedID}'`;

              let data_klaim = await request.query(queryDataTableKlaim);
              let klaim = data_klaim.recordset[0];

              let data_klaimdetail = await request.query(
                queryDataTableKlaimDetail
              );
              let klaimdetail = data_klaimdetail.recordset;

              klaim.lines = klaimdetail;
              let region_desc = klaimdetail[0].region_id;
              let sqlgetregionid = `SELECT * FROM r_region WHERE kode = '${region_desc}'`;
              let dataregion = await request.query(sqlgetregionid);

              let sqlgetregionidbydistributor = `SELECT * FROM r_region WHERE kode = '${klaim.kode_region}'`;
              let dataregionbydistributor = await request.query(
                sqlgetregionidbydistributor
              );
              let nama_region =
                dataregion.recordset.length > 0
                  ? dataregion.recordset[0].nama
                  : dataregionbydistributor.recordset.length > 0
                  ? dataregionbydistributor.recordset[0].nama
                  : "";
              let r_region_id =
                dataregion.recordset.length > 0
                  ? dataregion.recordset[0].r_region_id
                  : klaim.kode_region;
              klaim.nama_region = nama_region;

              if (r_distribution_channel_id) {
                r_distribution_channel_id =
                  "B1C029DC-8A20-45E3-AA13-8999A0E8452A";
              }

              let getdataemail1 =
                await request.query(`SELECT email_verifikasi FROM email_klaim 
                      WHERE r_distribution_channel_id='${r_distribution_channel_id}' AND r_region_id='${r_region_id}' AND role = 'SALES' AND isemail_klaim = 'Y'`);

              // console.log(`SELECT email_verifikasi FROM email_klaim
              // WHERE r_distribution_channel_id='${r_distribution_channel_id}' AND r_region_id='${r_region_id}' AND role = 'SALES' AND isemail_klaim = 'Y'`);
              let dataemail = [];

              let sqlgetstatusIntegasi = `SELECT TOP 1 * FROM integration_url ORDER BY created DESC`;
              let datastatusIntegasi = await request.query(
                sqlgetstatusIntegasi
              );
              let statusIntegasi =
                datastatusIntegasi.recordset.length > 0
                  ? datastatusIntegasi.recordset[0].status
                  : "DEV";

              if (statusIntegasi == "DEV") {
                dataemail.push(["tiasadeputra@gmail.com"]);
              } else {
                for (let i = 0; i < getdataemail1.recordset.length; i++) {
                  dataemail.push(getdataemail1.recordset[i].email_verifikasi);
                }
              }
              //console.log(dataemail);

              let insertDocumentNo = `INSERT INTO document_number_line
                      (document_number_id, r_organisasi_id, line)
                      VALUES('${document_number_id}','${r_organisasi_id}',${linenumber})`;
              //console.log(insertDocumentNo);
              await request.query(insertDocumentNo);

              let insertKlaim = `INSERT INTO audit_klaim
                      (klaim_id, m_user_id, rolename, status)
                      VALUES('${generatedID}', '${m_user_id}', 'DISTRIBUTOR', 'Pengajuan')`;
              //console.log(insertKlaim);
              await request.query(insertKlaim);

              listActivity = _.uniq(listActivity);
              dataemail = _.uniq(dataemail);
              const amount = numeral(nominal_claimable)
                .format("0,0")
                .replace(/,/g, ".");

              if (dataemail.length > 0) {
                const param = {
                  subject: "Klaim Proposal",
                  nomor_proposal: nomor_proposal,
                  activity: listActivity.toString(),
                  distributor: nama_pemohon,
                  tanggal_pengajuan: tanggal_invoice,
                  nominal_klaim: `Rp. ${amount}`,
                };
              }

              return res.success({
                data: klaim,
                message: "Insert data successfully",
              });
            });
          } catch (err) {
            let sqllog = `INSERT INTO log_error
                  (createdby,updatedby, error,menu,klaim_id)
                  VALUES('${m_user_id}','${m_user_id}', '${err}','KLAIM','${generatedID}')`;
            await request.query(sqllog);

            let sqlupdateKlaim = `UPDATE klaim
                  SET isactive='N', updated=getdate() WHERE klaim_id='${generatedID}'`;
            await request.query(sqlupdateKlaim);
            return res.error(err);
          }
        }
      );
    }
  },

  updatenew: async function (req, res) {
    const {
      m_direct_outlet_id,
      m_user_id,
      nomor_proposal,
      file_invoice,
      file_surat_klaim_sesuai_prinsiple,
      file_faktur_pajak,
      file_eproposal,
      file_ktp,
      file_rekap_klaim,
      file_copy_faktur,
      file_skp,
      jenis_klaim,
      nomor_ktp,
      nama_ktp,
      nomor_npwp,
      nama_npwp,
      nomor_faktur,
      tipe_pajak,
      tanggal_faktur_pajak,
      company_list,
      total_klaim,
      nominal_pajak,
      nominal_claimable,
      perihal_klaim,
      tanggal_invoice,
      m_distributor_id,
      invoice,
      periode_klaim,
      file_program,
      lines,
    } = JSON.parse(req.body.document);

    await DB.poolConnect;
    const request = DB.pool.request();
    let totalKlaim = 0;
    let budget = [];

    console.log("masuk sini.................", jenis_klaim);
    let nomor_ktp_text = nomor_ktp;
    let nama_ktp_text = nama_ktp;
    let nomor_npwp_text = nomor_npwp;
    let nama_npwp_text = nama_npwp;
    let nomor_faktur_text = nomor_faktur;
    let invoice_text = invoice;
    let periode_klaim_text = periode_klaim;

    console.log("cekk SDANDMKWNI");
    nomor_ktp_text = nomor_ktp_text
      .replace(/'/g, `''`)
      .replace(/"/g, `""`)
      .replace(/\\/g, `\\`);
    nama_ktp_text = nama_ktp_text
      .replace(/'/g, `''`)
      .replace(/"/g, `""`)
      .replace(/\\/g, `\\`);
    nomor_npwp_text = nomor_npwp_text
      .replace(/'/g, `''`)
      .replace(/"/g, `""`)
      .replace(/\\/g, `\\`);
    nomor_faktur_text = nomor_faktur_text
      .replace(/'/g, `''`)
      .replace(/"/g, `""`)
      .replace(/\\/g, `\\`);
    invoice_text = invoice_text
      .replace(/'/g, `''`)
      .replace(/"/g, `""`)
      .replace(/\\/g, `\\`);
    nama_npwp_text = nama_npwp_text
      .replace(/'/g, `''`)
      .replace(/"/g, `""`)
      .replace(/\\/g, `\\`);
    // periode_klaim_text = periode_klaim_text.replace(/'/g,`''`).replace(/"/g,`""`).replace(/\\/g,`\\`);

    console.log("wWE ", nomor_ktp_text);
    console.log("SDA ", nama_ktp_text);
    console.log("SDXW ", nomor_npwp_text);
    console.log("ZCZC ", nomor_faktur_text);
    console.log("WFE ", invoice_text);
    console.log("ADWD ", nama_npwp_text);

    console.log("cekk dskmdka");
    for (let i = 0; i < lines.length; i++) {
      let databudget = {
        nomor_proposal: lines[i].nomor_proposal,
        budget_awal_bgt: lines[i].budget_awal_bgt,
      };
      totalKlaim = totalKlaim + lines[i].total_klaim;

      budget.push("MASUK GAKKK ", databudget);
    }

    let uniqueBudget = _.uniqBy(budget, "nomor_proposal");
    //console.log(uniqueBudget);
    let totalBudgetAwal = 0;
    let dataklaimterpakai = 0;
    let budgetTerakhir = 0;
    let totalSisaKlaim = 0;
    for (let i = 0; i < uniqueBudget.length; i++) {
      let nomor_proposal = uniqueBudget[i].nomor_proposal;
      totalBudgetAwal = totalBudgetAwal + uniqueBudget[i].budget_awal_bgt;

      let cekbudget = `SELECT nomor,klaim FROM sisa_klaim WHERE nomor = '${nomor_proposal}'`;
      let getKlaimSAP = await request.query(cekbudget);
      let dataSAP = getKlaimSAP.recordset;

      if (dataSAP.length > 0) {
        budgetTerakhir = dataSAP[0].klaim;
      }

      let sqlHasKlaim = `SELECT
      kd.budget_id, kd.branch_code, kd.branch_desc, kd.activity, kd.brand,
      SUM(CASE WHEN k.kode_status='DR' THEN kd.total_klaim WHEN k.kode_status='RJF' THEN 0 ELSE kd.total_klaim END) AS budget_terpakai, 
      kd.activity_code,
      kd.nomor_proposal, kd.divisi, kd.cost_center, 
      kd.profit_center, kd.region_id, kd.company_code, kd.date_prop, kd.comp_id, kd.title
      FROM klaim_detail kd,klaim k WHERE k.klaim_id = kd.klaim_id
      AND kd.nomor_proposal='${nomor_proposal}' AND k.kode_status <> 'RJF'
      AND k.isactive= 'Y'
      GROUP BY
      kd.budget_id, kd.branch_code, kd.branch_desc, kd.activity, kd.brand,
      kd.activity_code,
      kd.nomor_proposal, kd.divisi, kd.cost_center, 
      kd.profit_center, kd.region_id, kd.company_code, kd.date_prop, kd.comp_id, kd.title`;

      let getdatahasklaim = await request.query(sqlHasKlaim);
      dataklaimterpakai =
        getdatahasklaim.recordset.length > 0
          ? getdatahasklaim.recordset[0].budget_terpakai
          : 0;
    }
    totalSisaKlaim =
      totalBudgetAwal - totalKlaim - dataklaimterpakai - budgetTerakhir;

    // console.log('totalKlaim ',totalKlaim);
    // console.log('totalBudgetAwal ',totalBudgetAwal);
    // console.log('budgetTerakhirDariSAP ',budgetTerakhir);
    // console.log('dataklaimterpakai ',dataklaimterpakai);
    // console.log('totalSisaKlaim ',totalSisaKlaim);

    let message = `Budget tidak mencukupi untuk diklaim 
                  Budget Awal : ${totalBudgetAwal} - 
                  Total Klaim : ${totalKlaim} - 
                  Klaim Terpakai(E-Sales) : ${dataklaimterpakai} - 
                  Klaim terpakai (SAP) : ${budgetTerakhir}
                  Sisa Klaim = ${totalSisaKlaim}`;

    // let cekOutlet = `SELECT * FROM outlet_klaim WHERE kode_alias = '${m_user_id}'`;
    // let dcek = await request.query(cekOutlet);
    // if(dcek.recordset.length > 0){
    //     console.log(cekOutlet);
    // }

    // return  res.error("xxxxxxxxx");

    if (totalSisaKlaim < 0) {
      //console.log('zz', message);
      //perlakukan sebagaimana mestinya formdata, meski ujung2nya return error,
      var uploadFile = req.file("file");
      uploadFile.upload({}, async function onUploadComplete(err, files) {
        return res.error({
          message: message,
        });
      });
    } else {
      const generatedID = uuid();
      var uploadFile = req.file("file");
      //console.log(uploadFile);
      uploadFile.upload(
        { maxBytes: 500000000000000 },
        async function onUploadComplete(err, files) {
          if (err) {
            let errMsg = err.message;
            //console.log(errMsg);
            let sqllog = `INSERT INTO log_error
                  (createdby,updatedby, error,menu,klaim_id)
                  VALUES('${m_user_id}','${m_user_id}', '${err}','KLAIM','${generatedID}')`;
            await request.query(sqllog);

            let sqlupdateKlaim = `UPDATE klaim
                  SET isactive='N',updated=getdate() WHERE klaim_id='${generatedID}'`;
            await request.query(sqlupdateKlaim);

            return res.error(errMsg);
          }

          for (const file of files) {
            //console.log('filename', file.filename)
            fs.mkdirSync(dokumentPath("klaimproposal", generatedID), {
              recursive: true,
            });

            const filesamaDir = glob.GlobSync(
              path.resolve(
                dokumentPath("klaimproposal", generatedID),
                file.filename.replace(/\.[^/.]+$/, "")
              ) + "*"
            );
            if (filesamaDir.found.length > 0) {
              //console.log('isexist file nama sama', filesamaDir.found[0])
              fs.unlinkSync(filesamaDir.found[0]);
            }
            fs.renameSync(
              file.fd,
              path.resolve(
                dokumentPath("klaimproposal", generatedID),
                file.filename
              )
            );
          }

          // ++++++++++++++++++++
          //  kode INSERT ke db |
          // ++++++++++++++++++++

          try {
            console.log("TEST");
            if (m_distributor_id == null) {
              console.log("MASUK MENU DIRECT OUTLET");
              console.log("m_direct_outlet_id : ", m_direct_outlet_id);
              let cekDirectOutlet = `SELECT * FROM m_direct_outlet mdo WHERE m_direct_outlet_id = '${m_direct_outlet_id}'`;
              let datadiroutid = await request.query(cekDirectOutlet);
              console.log(cekDirectOutlet);

              let kode_vendor = datadiroutid.recordset[0].kode_vendor;
              console.log(kode_vendor, "kode vendor");

              let perihalklaim = ``;
              if (perihal_klaim) {
                perihalklaim = perihal_klaim;
                perihalklaim = perihalklaim
                  .replace(/'/g, `''`)
                  .replace(/"/g, `""`)
                  .replace(/\\/g, `\\`);
                perihalklaim = `'${perihalklaim}'`;
              } else {
                perihalklaim = `NULL`;
              }

              let tanggalfakturpajak = ``;
              if (tanggal_faktur_pajak) {
                tanggalfakturpajak = `'${tanggal_faktur_pajak}'`;
              } else {
                tanggalfakturpajak = `NULL`;
              }

              let sqlgetdocumentno = `SELECT document_number_id FROM document_number WHERE kode = 'KLAIM'`;

              let getdocument = await request.query(sqlgetdocumentno);
              let document_number_id =
                getdocument.recordset.length > 0
                  ? getdocument.recordset[0].document_number_id
                  : "";

              //let queryDataTable = `SELECT TOP 1 nomor_klaim FROM klaim WHERE m_pajak_id='${m_pajak_id}' ORDER BY nomor_klaim DESC`;
              let queryDataTable = `SELECT COUNT(1) AS nomor_klaim FROM klaim k`;
              let getsequence = await request.query(queryDataTable);
              const row = getsequence.recordset[0];
              //let linenumber = getsequence.recordset.length > 0 ? (Number(row.nomor_klaim.split('/')[4]) + 1000) : 1000;
              let linenumber = row.nomor_klaim;
              let totalrows = pad(linenumber);
              let bulan = moment(tanggal_invoice, "YYYY-MM-DD").format("MMM");
              let tahun = moment(tanggal_invoice, "YYYY-MM-DD").format("YYYY");

              let nomor_dokumen_klaim =
                tahun +
                "/PROP/" +
                bulan.toLocaleUpperCase() +
                "/" +
                kode_vendor +
                "/" +
                totalrows;
              console.log(nomor_dokumen_klaim);

              let status = `Pengajuan`;
              let kode_status = `DR`;
              console.log(generatedID, "generateId");
              let sql = `INSERT INTO klaim
                (klaim_id,
                createdby,
                updatedby,
                nomor_klaim, 
                status,
                file_invoice, 
                file_surat_klaim_sesuai_prinsiple, 
                file_eproposal, 
                file_ktp, 
                file_rekap_klaim, 
                file_skp, 
                file_faktur_pajak,
                file_copy_faktur,
                nomor_ktp, 
                nama_ktp, 
                nomor_npwp, 
                nama_npwp, 
                nomor_faktur, 
                tipe_pajak, 
                tanggal_faktur_pajak, 
                company_list, 
                total_klaim, 
                nominal_pajak, 
                nominal_claimable, 
                perihal_klaim, 
                kode_status,
                tanggal_invoice,
                m_direct_outlet_id,
                invoice,
                jenis_klaim,
                periode_klaim,
                file_program
                )
                VALUES(
                    '${generatedID}',
                    '${m_user_id}',
                    '${m_user_id}',
                    '${nomor_dokumen_klaim}',
                    '${status}',
                    '${file_invoice}',
                    '${file_surat_klaim_sesuai_prinsiple}',
                    '${file_faktur_pajak}',
                    '${file_copy_faktur}',
                    '${file_eproposal}',
                    '${file_ktp}',
                    '${file_rekap_klaim}',   
                    '${file_skp}',
                    '${nomor_ktp_text}',
                    '${nama_ktp_text}',
                    '${nomor_npwp_text}',
                    '${nama_npwp_text}',
                    '${nomor_faktur_text}',
                    '${tipe_pajak}',
                    ${tanggalfakturpajak},
                    '${company_list}',
                    ${total_klaim},
                    '${nominal_pajak}', 
                    '${nominal_claimable}', 
                    ${perihalklaim}, 
                    '${kode_status}',
                    '${tanggal_invoice}',
                    '${m_direct_outlet_id}',
                    '${invoice}','${jenis_klaim}',
                    '${periode_klaim_text}',
                    '${file_program}'
                )`;
              console.log(sql, "sql");

              //  =========================

              console.log("TEST II");

              // let sql;
              request.query(sql, async (err, result) => {
                // try {
                console.log("ERR");
                if (err) {
                  // let sqllog = `INSERT INTO log_error
                  //         (createdby,updatedby, error,menu,klaim_id)
                  //         VALUES('${m_user_id}','${m_user_id}', '${err}','KLAIM','${generatedID}')`;
                  // await request.query(sqllog);

                  // let sqlupdateKlaim = `UPDATE klaim
                  //         SET isactive='N',updated=getdate() WHERE klaim_id='${generatedID}'`;
                  // await request.query(sqlupdateKlaim);

                  return res.error(err);
                }
                console.log("MASUK");

                let listActivity = [];
                let totalKlaimHeader = 0;
                for (let i = 0; i < lines.length; i++) {
                  totalKlaimHeader =
                    totalKlaimHeader + Number(lines[i].total_klaim);
                  let budget_id = lines[i].budget_id;
                  let branch_code = lines[i].branch_code;
                  let branch_desc = lines[i].branch_desc;
                  let activity = lines[i].activity;
                  let activity_code = lines[i].activity_code;
                  let brand = lines[i].brand.replace(/'/g, "");
                  let budget = Number(lines[i].budget);
                  let budget_awal_bgt = Number(lines[i].budget_awal_bgt);
                  let total_klaim = Number(lines[i].total_klaim);
                  let outstanding_klaim = Number(lines[i].outstanding_klaim);
                  let ischecked = lines[i].ischecked;
                  let nomor_proposal = lines[i].nomor_proposal;
                  let comp_id = lines[i].comp_id;
                  let company_code = lines[i].company;
                  let title = lines[i].title.replace(/'/g, "");
                  let region = lines[i].region;
                  console.log(region, "region");
                  let date_prop = lines[i].date_prop;
                  let profitcenter = lines[i].profitcenter;
                  let divisi = lines[i].divisi;
                  console.log(divisi, "divisi");
                  let cost_center = lines[i].cost_center;

                  console.log(ischecked, "ischecked");
                  console.log(generatedID, "generateId detail");
                  if (ischecked && total_klaim > 0) {
                    let queryInsertLines = `INSERT INTO klaim_detail
                            (createdby, updatedby, klaim_id, budget_id, branch_code, 
                            branch_desc, activity, brand, budget,total_klaim,outstanding_klaim,
                            activity_code,nomor_proposal,
                            divisi,
                            cost_center,
                            profit_center,
                            region_id,
                            company_code,
                            date_prop,
                            comp_id,
                            title,
                            budget_awal
                            )
                            VALUES('${m_user_id}','${m_user_id}', '${generatedID}', 
                            '${budget_id}', '${branch_code}', '${branch_desc}', 
                            '${activity}', '${brand}', ${budget},${total_klaim},${outstanding_klaim},
                            '${activity_code}','${nomor_proposal}','${divisi}',
                            '${cost_center}',
                            '${profitcenter}',
                            '${region}',
                            '${company_code}',
                            '${date_prop}',
                            '${comp_id}',
                            '${title}',
                            ${budget_awal_bgt}
                            )`;
                    console.log(queryInsertLines, "INSERT detail");
                    await request.query(queryInsertLines);
                    listActivity.push(activity);

                    // PROSES DELETE LOCK PROSES KLAIM
                    let sqlDeleteDataLockKlaim = `DELETE FROM lock_eprop_klaim 
                            WHERE nomor_proposal = '${nomor_proposal}' AND m_user_id = '${m_user_id}'`;
                    await request.query(sqlDeleteDataLockKlaim);
                  }
                }

                // INSERT notifikasi
                // let user_klaim = `SELECT * FROM m_role_sales mrs WHERE kode_region = '${kode_region_}'`;
                // let res_ = await request.query(user_klaim);
                // res_ = res_.recordset;

                // // if (res_.length > 0) {
                // for (let z = 0; z < res_.length; z++) {
                // let m_user_id_ = res_[z].m_user_id;
                let insertnotify = `INSERT INTO notifikasi_klaim (klaim_id,kode_status,status,is_proses,createddate,updateddate,m_user_id)
                            VALUES ('${generatedID}','DR','Pengajuan',0,getdate(),null,'${m_user_id}')`;

                console.log(insertnotify);
                await request.query(insertnotify);
                // }
                // }

                let nominalPajakHeader = 0;
                if (tipe_pajak == "PPN 10%") {
                  nominalPajakHeader = (totalKlaimHeader * 10) / 100;
                } else if (tipe_pajak == "PPN 11%") {
                  nominalPajakHeader = (totalKlaimHeader * 11) / 100;
                }

                //Memastikan nilai header sama dengan jumlah detail
                let totalNominalClaimableHeader =
                  totalKlaimHeader + nominalPajakHeader;
                let updateHeader = `UPDATE klaim SET total_klaim=${totalKlaimHeader},
                      nominal_pajak=${nominalPajakHeader},
                      nominal_claimable=${totalNominalClaimableHeader} WHERE klaim_id = '${generatedID}'`;
                //console.log(updateHeader);
                await request.query(updateHeader);

                let queryDataTableKlaim = `SELECT *
                      FROM klaim_v kl 
                      WHERE kl.klaim_id ='${generatedID}'`;

                let queryDataTableKlaimDetail = `SELECT *
                      FROM klaim_detail WHERE klaim_id = '${generatedID}'`;

                let data_klaim = await request.query(queryDataTableKlaim);
                let klaim = data_klaim.recordset[0];

                let data_klaimdetail = await request.query(
                  queryDataTableKlaimDetail
                );
                let klaimdetail = data_klaimdetail.recordset;

                klaim.lines = klaimdetail;
                let region_desc = klaimdetail[0].region_id;
                let sqlgetregionid = `SELECT * FROM r_region WHERE kode = '${region_desc}'`;
                let dataregion = await request.query(sqlgetregionid);

                let sqlgetregionidbydistributor = `SELECT * FROM r_region WHERE kode = '${klaim.kode_region}'`;
                let dataregionbydistributor = await request.query(
                  sqlgetregionidbydistributor
                );
                let nama_region =
                  dataregion.recordset.length > 0
                    ? dataregion.recordset[0].nama
                    : dataregionbydistributor.recordset.length > 0
                    ? dataregionbydistributor.recordset[0].nama
                    : "";
                let r_region_id =
                  dataregion.recordset.length > 0
                    ? dataregion.recordset[0].r_region_id
                    : klaim.kode_region;
                klaim.nama_region = nama_region;

                let r_distribution_channel_id =
                  "B1C029DC-8A20-45E3-AA13-8999A0E8452A";

                let getdataemail1 =
                  await request.query(`SELECT email_verifikasi FROM email_klaim 
                      WHERE r_distribution_channel_id='${r_distribution_channel_id}' AND r_region_id='${r_region_id}' AND role = 'SALES' AND isemail_klaim = 'Y'`);

                // console.log(`SELECT email_verifikasi FROM email_klaim
                // WHERE r_distribution_channel_id='${r_distribution_channel_id}' AND r_region_id='${r_region_id}' AND role = 'SALES' AND isemail_klaim = 'Y'`);
                let dataemail = [];

                let sqlgetstatusIntegasi = `SELECT TOP 1 * FROM integration_url ORDER BY created DESC`;
                let datastatusIntegasi = await request.query(
                  sqlgetstatusIntegasi
                );
                let statusIntegasi =
                  datastatusIntegasi.recordset.length > 0
                    ? datastatusIntegasi.recordset[0].status
                    : "DEV";

                if (statusIntegasi == "DEV") {
                  dataemail.push(["tiasadeputra@gmail.com"]);
                } else {
                  for (let i = 0; i < getdataemail1.recordset.length; i++) {
                    dataemail.push(getdataemail1.recordset[i].email_verifikasi);
                  }
                }
                //console.log(dataemail);

                let sqlget_org = `SELECT * FROM r_organisasi ro INNER JOIN m_direct_outlet mdo ON ro.kode = mdo.kode_vendor WHERE mdo.m_direct_outlet_id = '${m_direct_outlet_id}'`;
                let exsql = await request.query(sqlget_org);
                let r_organisasi_id = exsql.recordset[0].r_organisasi_id;

                let nama_pemohon = exsql.recordset[0].nama;

                let insertDocumentNo = `INSERT INTO document_number_line
                      (document_number_id, r_organisasi_id, line)
                      VALUES('${document_number_id}','${r_organisasi_id}',${linenumber})`;
                //console.log(insertDocumentNo);
                await request.query(insertDocumentNo);

                let insertKlaim = `INSERT INTO audit_klaim
                      (klaim_id, m_user_id, rolename, status)
                      VALUES('${generatedID}', '${m_user_id}', 'DISTRIBUTOR', 'Pengajuan')`;
                //console.log(insertKlaim);
                await request.query(insertKlaim);

                listActivity = _.uniq(listActivity);
                dataemail = _.uniq(dataemail);
                const amount = numeral(nominal_claimable)
                  .format("0,0")
                  .replace(/,/g, ".");

                if (dataemail.length > 0) {
                  const param = {
                    subject: "Klaim Proposal",
                    nomor_proposal: nomor_proposal,
                    activity: listActivity.toString(),
                    distributor: nama_pemohon,
                    tanggal_pengajuan: tanggal_invoice,
                    nominal_klaim: `Rp. ${amount}`,
                  };
                }

                return res.success({
                  data: klaim,
                  message: "Insert data successfully",
                });
              });
            }
          } catch (err) {
            console.log("MASUKKK CATCH ERR");
            let sqllog = `INSERT INTO log_error
                  (createdby,updatedby, error,menu,klaim_id)
                  VALUES('${m_user_id}','${m_user_id}', '${err}','KLAIM','${generatedID}')`;
            await request.query(sqllog);
            console.log(sqllog, "sqllog");

            let sqlupdateKlaim = `UPDATE klaim
                  SET isactive='N', updated=getdate() WHERE klaim_id='${generatedID}'`;
            await request.query(sqlupdateKlaim);
            return res.error(err);
          }
        }
      );
    }
  },

  updateKlaim: async function (req, res) {
    const {
      klaim_id,
      m_user_id,
      proposal_id,
      nomor_proposal,
      nomor_klaim,
      title,
      date_prop,
      company,
      region,
      file_invoice,
      file_surat_klaim_sesuai_prinsiple,
      file_faktur_pajak,
      file_eproposal,
      file_ktp,
      file_rekap_klaim,
      file_copy_faktur,
      file_skp,
      file_program,
      nomor_ktp,
      nama_ktp,
      nomor_npwp,
      nama_npwp,
      nomor_faktur,
      tipe_pajak,
      tanggal_faktur_pajak,
      company_code,
      total_klaim,
      nominal_pajak,
      nominal_claimable,
      perihal_klaim,
      tanggal_invoice,
      divisi,
      m_distributor_id,
      invoice,
      lines,
      periode_klaim
    } = JSON.parse(req.body.document);


    var uploadFile = req.file("file");
    uploadFile.upload(
      { maxBytes: 500000000000000 },
      async function onUploadComplete(err, files) {
        if (err) {
          let errMsg = err.message;
          return res.error(errMsg);
        }
        await DB.poolConnect;
        const request = DB.pool.request();
        const requestuserproposal = await DBPROP.promise();

        let sqlGetNomorProposal = `SELECT DISTINCT budget_id,nomor_proposal,klaim_detail_id FROM klaim_detail kd 
        WHERE kd.klaim_id = '${klaim_id}'`;

        let getDataProposal = await request.query(sqlGetNomorProposal);
        let dataProposal = getDataProposal.recordset;

        // CEK STATUS KLAIM

        let sqlGetStatusKlaim = `SELECT kode_status FROM klaim WHERE klaim_id = '${klaim_id}'`;
        let getKodeStatus = await request.query(sqlGetStatusKlaim);
        let kodeStatus =
          getKodeStatus.recordset.length > 0
            ? getKodeStatus.recordset[0].kode_status
            : null;

        console.log("kodeStatus ", kodeStatus);

        let errorValidationBudget = [];
        let errorValidationBudgetId = [];
        for (let i = 0; i < dataProposal.length; i++) {
          let budget_id = dataProposal[i].budget_id;
          let klaim_detail_id = dataProposal[i].klaim_detail_id;
          // let sqlGetSumTotalKlaimYangSudahMasuk  = `SELECT COALESCE(SUM(total_klaim),0) AS totalKlaim FROM klaim_detail WHERE budget_id = '${budget_id}' AND klaim_detail_id <> '${klaim_detail_id}'`;

          let sqlGetSumTotalKlaimYangSudahMasuk = `SELECT COALESCE(SUM(kd.total_klaim),0) AS totalKlaim FROM klaim_detail kd,klaim k 
          WHERE kd.budget_id = '${budget_id}' AND kd.klaim_detail_id <> '${klaim_detail_id}'
          AND k.klaim_id = kd.klaim_id
          AND k.kode_status <> 'RJF'`;

          let getSumTotalKlaimYangSudahMasuk = await request.query(
            sqlGetSumTotalKlaimYangSudahMasuk
          );
          let totalKlaimYangSudahMasuk =
            getSumTotalKlaimYangSudahMasuk.recordset.length > 0
              ? getSumTotalKlaimYangSudahMasuk.recordset[0].totalKlaim
              : 0;

          // let sqlGetSumTotalKlaim  = `SELECT COALESCE(SUM(total_klaim),0) AS totalKlaim FROM klaim_detail WHERE budget_id = '${budget_id}' AND klaim_detail_id = '${klaim_detail_id}'`;

          let sqlGetSumTotalKlaim = `SELECT COALESCE(SUM(kd.total_klaim),0) AS totalKlaim FROM klaim_detail kd,klaim k 
          WHERE kd.budget_id = '${budget_id}' AND kd.klaim_detail_id = '${klaim_detail_id}'
          AND k.klaim_id = kd.klaim_id`;

          let getSumTotalKlaimYang = await request.query(sqlGetSumTotalKlaim);
          let totalKlaim = getSumTotalKlaimYang.recordset.length > 0 ? getSumTotalKlaimYang.recordset[0].totalKlaim : 0;

          let sqlGetSumBudget = `SELECT COALESCE(SUM(budget),0) AS totalBudget FROM proposal_budget WHERE proposal_budget_id = '${budget_id}'`;
          let getSumBudget = await requestuserproposal.query(sqlGetSumBudget);
          let totalBudget = getSumBudget[0].length > 0 ? Number(getSumBudget[0][0].totalBudget) : 0;

          let totalKlaimKeseluruhan = totalKlaimYangSudahMasuk + totalKlaim;
          let sisaBudget = totalBudget - totalKlaimKeseluruhan;

          if (totalKlaimKeseluruhan > totalBudget) {
            console.log("budget_id ", budget_id);
            console.log(
              "sqlGetSumTotalKlaimYangSudahMasuk ",
              sqlGetSumTotalKlaimYangSudahMasuk
            );
            console.log("totalBudget ", totalBudget);
            console.log("totalKlaimYangSudahMasuk ", totalKlaimYangSudahMasuk);
            console.log("totalKlaimKeseluruhan ", totalKlaimKeseluruhan);
            console.log("totalKlaim ", totalKlaim);
            errorValidationBudgetId.push(budget_id);
            errorValidationBudget.push(`Budget ID ${budget_id} Nominal Klaim ${numeral(totalKlaim)
              .format("0,0")
              .replace(
                /,/g,
                "."
              )} terlalu besar budget tidak cukup E-PROP sudah pernah diklaim sebesar 
            ${numeral(totalKlaimKeseluruhan)
              .format("0,0")
              .replace(/,/g, ".")} sisa budget tersedia ${numeral(sisaBudget)
              .format("0,0")
              .replace(/,/g, ".")}`);
          }
        }

        console.log("errorValidationBudget ", errorValidationBudget);
        console.log("errorValidationBudgetId ", errorValidationBudgetId);

        if (errorValidationBudget.length > 0) {
          let message = ``;
          for (let i = 0; i < errorValidationBudget.length; i++) {
            let text = errorValidationBudget[i];
            message = message + `${i + 1}. ${text} <br>`;
          }

          return res.error({
            message: message,
          });
        } else {
          for (const file of files) {
            //console.log('filename', file.filename)
            fs.mkdirSync(dokumentPath("klaimproposal", klaim_id), {
              recursive: true,
            });

            const filesamaDir = glob.GlobSync(
              path.resolve(
                dokumentPath("klaimproposal", klaim_id),
                file.filename.replace(/\.[^/.]+$/, "")
              ) + "*"
            );

            try {
              fs.renameSync(
                file.fd,
                path.resolve(
                  dokumentPath("klaimproposal", klaim_id),
                  file.filename
                )
              );
            } catch (error) {
              console.log(error);
            }
          }

          try {
            let sqlgetKlaim = `SELECT * FROM klaim WHERE klaim_id = '${klaim_id}'`;
            let dataklaim = await request.query(sqlgetKlaim);
            let kdstatus =
              dataklaim.recordset.length > 0
                ? dataklaim.recordset[0].kode_status
                : "";
            let statusKlaim =
              dataklaim.recordset.length > 0
                ? dataklaim.recordset[0].status
                : "";

            // let sqlgetpajak = `SELECT * FROM m_pajak WHERE kode = '${kode_pajak}'`;
            // let datapajak = await request.query(sqlgetpajak);
            let m_pajak_id = dataklaim.recordset[0].m_pajak_id;

            let kode_status = ``;
            let status = ``;
            let createdDate = ``;
            if (kdstatus == 'RJF') {
              kode_status = `DR`;
              status = "Pengajuan";
              createdDate = `created=getdate(),`;
            } else {
              kode_status = kdstatus;
              status = statusKlaim;
            }

            let perihalklaim = ``;
            if (perihal_klaim) {
              perihalklaim = perihal_klaim;
              perihalklaim = perihalklaim
                .replace(/'/g, `''`)
                .replace(/"/g, `""`)
                .replace(/\\/g, `\\`);
              perihalklaim = `'${perihalklaim}'`;
            } else {
              perihalklaim = `NULL`;
            }

            let fileinvoice = ``;
            if (file_invoice && !file_invoice == "") {
              fileinvoice = `'${file_invoice}'`;
            } else {
              fileinvoice = `NULL`;
            }

            let dateprop = ``;
            if (date_prop && !date_prop == "") {
              dateprop = `'${date_prop}'`;
            } else {
              dateprop = `NULL`;
            }

            let filesuratklaimsesuaiprinsiple = ``;
            if (
              file_surat_klaim_sesuai_prinsiple &&
              !file_surat_klaim_sesuai_prinsiple == ""
            ) {
              filesuratklaimsesuaiprinsiple = `'${file_surat_klaim_sesuai_prinsiple}'`;
            } else {
              filesuratklaimsesuaiprinsiple = `NULL`;
            }

            let filefakturpajak = ``;
            if (file_faktur_pajak && !file_faktur_pajak == "") {
              filefakturpajak = `'${file_faktur_pajak}'`;
            } else {
              filefakturpajak = `NULL`;
            }

            let fileeproposal = ``;
            if (file_eproposal && !file_eproposal == "") {
              fileeproposal = `'${file_eproposal}'`;
            } else {
              fileeproposal = `NULL`;
            }

            let filektp = ``;
            if (file_ktp && !file_ktp == "") {
              filektp = `'${file_ktp}'`;
            } else {
              filektp = `NULL`;
            }

            let filerekapklaim = ``;
            if (file_rekap_klaim && !file_rekap_klaim == "") {
              filerekapklaim = `'${file_rekap_klaim}'`;
            } else {
              filerekapklaim = `NULL`;
            }

            let filecopyfaktur = ``;
            if (file_copy_faktur && !file_copy_faktur == "") {
              filecopyfaktur = `'${file_copy_faktur}'`;
            } else {
              filecopyfaktur = `NULL`;
            }

            let fileskp = ``;
            if (file_skp && !file_skp == "") {
              fileskp = `'${file_skp}'`;
            } else {
              fileskp = `NULL`;
            }

            let fileProgram = ``;
            if (file_program && !file_program == "") {
              fileProgram = `'${file_program}'`;
            } else {
              fileProgram = `NULL`;
            }


            

            let tanggalfakturpajak = ``;
            if (tanggal_faktur_pajak && !tanggal_faktur_pajak == "") {
              tanggalfakturpajak = `'${tanggal_faktur_pajak}'`;
            } else {
              tanggalfakturpajak = `NULL`;
            }

            let proposalid = ``;
            if (proposal_id && !proposal_id == "") {
              proposalid = `'${proposal_id}'`;
            } else {
              proposalid = `NULL`;
            }

            let nomorproposal = ``;
            if (nomor_proposal && !nomor_proposal == "") {
              nomorproposal = `'${nomor_proposal}'`;
            } else {
              nomorproposal = `NULL`;
            }

            let nomorklaim = ``;
            if (nomor_klaim && !nomor_klaim == "") {
              nomorklaim = `'${nomor_klaim}'`;
            } else {
              nomorklaim = `NULL`;
            }

            let fieldtitle = ``;
            if (title && !title == "") {
              fieldtitle = `'${title}'`;
            } else {
              fieldtitle = `NULL`;
            }

            let fieldcompany = ``;
            if (company && !company == "") {
              fieldcompany = `'${company}'`;
            } else {
              fieldcompany = `NULL`;
            }

            let fieldregion = ``;
            if (region && !region == "") {
              fieldregion = `'${region}'`;
            } else {
              fieldregion = `NULL`;
            }

            let nomorktp = ``;
            if (nomor_ktp && !nomor_ktp == "") {
              nomorktp = nomor_ktp;
              nomorktp = nomorktp
                .replace(/'/g, `''`)
                .replace(/"/g, `""`)
                .replace(/\\/g, `\\`);
              nomorktp = `'${nomorktp}'`;
            } else {
              nomorktp = `NULL`;
            }

            let namaktp = ``;
            if (nama_ktp && !nama_ktp == "") {
              namaktp = nama_ktp;
              namaktp = namaktp
                .replace(/'/g, `''`)
                .replace(/"/g, `""`)
                .replace(/\\/g, `\\`);
              namaktp = `'${namaktp}'`;
            } else {
              namaktp = `NULL`;
            }

            let nomornpwp = ``;
            if (nomor_npwp && !nomor_npwp == "") {
              nomornpwp = nomor_npwp;
              nomornpwp = nomornpwp
                .replace(/'/g, `''`)
                .replace(/"/g, `""`)
                .replace(/\\/g, `\\`);
              nomornpwp = `'${nomornpwp}'`;
            } else {
              nomornpwp = `NULL`;
            }

            let namanpwp = ``;
            if (nama_npwp && !nama_npwp == "") {
              namanpwp = nama_npwp;
              namanpwp = namanpwp
                .replace(/'/g, `''`)
                .replace(/"/g, `""`)
                .replace(/\\/g, `\\`);
              namanpwp = `'${namanpwp}'`;
            } else {
              namanpwp = `NULL`;
            }

            let nomorfaktur = ``;
            if (nomor_faktur && !nomor_faktur == "") {
              nomorfaktur = nomor_faktur;
              nomorfaktur = nomorfaktur
                .replace(/'/g, `''`)
                .replace(/"/g, `""`)
                .replace(/\\/g, `\\`);
              nomorfaktur = `'${nomorfaktur}'`;
            } else {
              nomorfaktur = `NULL`;
            }

            let tipepajak = ``;
            if (tipe_pajak && !tipe_pajak == "") {
              tipepajak = `'${tipe_pajak}'`;
            } else {
              tipepajak = `NULL`;
            }

            let fielddivisi = ``;
            if (divisi && !divisi == "") {
              fielddivisi = `'${divisi}'`;
            } else {
              fielddivisi = `NULL`;
            }

            let fieldistributor = ``;
            if (m_distributor_id && !m_distributor_id == "") {
              fieldistributor = `'${m_distributor_id}'`;
            } else {
              fieldistributor = `NULL`;
            }

            let invoiceField = ``;
            if(invoice && !invoice == ""){
              invoiceField = invoice;
              invoiceField = invoiceField
              .replace(/'/g, `''`)
              .replace(/"/g, `""`)
              .replace(/\\/g, `\\`);

              invoiceField = `'${invoiceField}'`;

            } else {
              invoiceField = `NULL`;
            }


            let periodeKlaimtext = ``;
            if(periode_klaim && !periode_klaim == ""){
              periodeKlaimtext = periode_klaim;
              periodeKlaimtext = periodeKlaimtext
              .replace(/'/g, `''`)
              .replace(/"/g, `""`)
              .replace(/\\/g, `\\`);

              periodeKlaimtext = `'${periodeKlaimtext}'`;

            } else {
              periodeKlaimtext = `NULL`;
            }



            console.log('periodeKlaimtext ',periodeKlaimtext);

            let sqlUpdate = `
            UPDATE klaim
            SET isactive='Y',
            ${createdDate}
            updated=getdate(),
            updatedby='${m_user_id}', 
            proposal_id=${proposalid}, 
            nomor_proposal=${nomorproposal}, 
            nomor_klaim=${nomorklaim}, 
            title=${fieldtitle}, 
            date_prop=${dateprop}, 
            company=${fieldcompany}, 
            region=${fieldregion}, 
            status='${status}', 
            file_invoice=${fileinvoice}, 
            file_surat_klaim_sesuai_prinsiple=${filesuratklaimsesuaiprinsiple}, 
            file_faktur_pajak=${filefakturpajak}, 
            file_eproposal=${fileeproposal}, 
            file_ktp=${filektp}, 
            file_rekap_klaim=${filerekapklaim}, 
            file_copy_faktur=${filecopyfaktur}, 
            file_skp=${fileskp}, 
            file_program=${fileProgram},
            nomor_ktp=${nomorktp}, 
            nama_ktp=${namaktp}, 
            nomor_npwp=${nomornpwp}, 
            nama_npwp=${namanpwp}, 
            nomor_faktur=${nomorfaktur}, 
            tipe_pajak=${tipepajak}, 
            tanggal_faktur_pajak=${tanggalfakturpajak}, 
            company_list='${company_code}', 
            total_klaim=${total_klaim}, 
            nominal_pajak=${nominal_pajak}, 
            nominal_claimable=${nominal_claimable}, 
            perihal_klaim= ${perihalklaim}, 
            kode_status='${kode_status}', 
            tanggal_invoice='${tanggal_invoice}', 
            m_pajak_id='${m_pajak_id}', 
            divisi=${fielddivisi}, 
            invoice = ${invoiceField},
            reason=NULL,
            m_distributor_id=${fieldistributor},
            periode_klaim = ${periodeKlaimtext}
            WHERE klaim_id='${klaim_id}'`;
            await request.query(sqlUpdate);



            if (kdstatus == 'RJF') {

              let insertAudit = `INSERT INTO audit_klaim (klaim_id,m_user_id,rolename,status) 
              VALUES ('${klaim_id}','${m_user_id}','DISTRIBUTOR','Pengajuan')`;
              await request.query(insertAudit);

            }

            return res.success({
              message: "Update data successfully",
            });

          } catch (err) {
            return res.error(err);
          }
        }
      }
    );
  },

  getfile: async function (req, res) {
    // const user = req.param('user')
    const record = req.param("record");
    const filename = req.param("filename");

    const filesamaDir = glob.GlobSync(
      path.resolve(dokumentPath("klaimproposal", record), filename + "*")
    );
    console.log(filesamaDir);
    if (filesamaDir.found.length > 0) {
      console.log(filesamaDir.found[0]);

      // return res.send(filesamaDir.found[0]);
      // return res.success('OK');
      var lastItemAkaFilename = path.basename(filesamaDir.found[0]);
      return res.download(filesamaDir.found[0], lastItemAkaFilename);
    }
    return res.error("Failed, File Not Found");
  },

  getReasonReject: async function (req, res) {
    const {
      query: { klaim_id },
    } = req;
    console.log(req.query);
    try {
      const request = DB.pool.request();

      let queryDataTable = `SELECT createddate,alasan FROM reject_klaim_log WHERE klaim_id = '${klaim_id}' order BY createddate DESC `;

      console.log(queryDataTable);

      let data_reject = await request.query(queryDataTable);
      console.log(data_reject);
      let listReason = data_reject.recordset;

      console.log("momom");

      for (let i = 0; i < listReason.length; i++) {
        listReason[i].no = i + 1;
      }

      return res.success({
        result: listReason,
        message: "Fetch data successfully",
      });
    } catch (err) {
      return res.error(err);
    }
  },

  approveKlaim: async function (req, res) {
    const {
      m_user_id,
      klaim_id,
      nama_ktp,
      nomor_ktp,
      r_pajak_id,
      tanggal_posting,
      nominal_claimable,
      r_gl_id,
      value_gl,
      r_costcenter_id,
      r_ar_id,
      value_ar,
      pph,
      r_partner_bank_key_id,
      r_payment_term_klaim_id,
      opsional_pph,
      noted,
      nama_npwp,
      nomor_faktur,
      tanggal_faktur_pajak,
      nomor_npwp,
      invoice,
      r_house_bank,
    } = req.body;

    console.log(req.body);
    try {
      // return res.error(invoice);
      await DB.poolConnect;
      const request = DB.pool.request();
      let sqlgetrole = `SELECT nama FROM m_user_role_v WHERE m_user_id='${m_user_id}'`;
      let datarole = await request.query(sqlgetrole);
      let rolename =
        datarole.recordset.length > 0 ? datarole.recordset[0].nama : "SYSTEM";

      let sqlgetklaim = `SELECT kode_status FROM klaim WHERE klaim_id = '${klaim_id}'`;
      let dataklaim = await request.query(sqlgetklaim);
      let kodeStatusExisting =
        dataklaim.recordset.length > 0
          ? dataklaim.recordset[0].kode_status
          : null;

      if (kodeStatusExisting == "DR") {
        let kodeStatus = "VER";
        let status = "Terverifikasi Adm MI, Waiting Acct. MI";

        let dataamount = JSON.parse(req.body.amount);
        let dataKlaimActivity = dataamount.amount.activity;

        let sqlupdate = `UPDATE klaim SET
            updatedby='${m_user_id}',
            kode_status = '${kodeStatus}',
            status='${status}'
            WHERE klaim_id='${klaim_id}'`;
        console.log(sqlupdate);
        await request.query(sqlupdate);

        let insertAudit = `INSERT INTO audit_klaim (klaim_id,m_user_id,rolename,status) 
            VALUES ('${klaim_id}','${m_user_id}','${rolename}','${status}')`;
        await request.query(insertAudit);

        for (let i = 0; i < dataKlaimActivity.length; i++) {
          let klaim_detail_id = dataKlaimActivity[i].klaim_detail_id;
          let isclosed = dataKlaimActivity[i].isclosed;

          let closedbudget = ``;

          if (isclosed) {
            closedbudget = `Y`;
          } else {
            closedbudget = `N`;
          }

          let sqlupdate = `UPDATE klaim_detail 
                SET isclosed = '${closedbudget}'
                WHERE klaim_detail_id='${klaim_detail_id}'`;
          await request.query(sqlupdate);
        }

        return res.success({
          message: "Verifikasi Success",
        });
      } else if (kodeStatusExisting == "VER") {
        let status = "Terverifikasi Acct. MI, Waiting Pengiriman Dok Klaim";
        let kodeStatus = "VERACC";

        let updateData = `UPDATE klaim set kode_status = '${kodeStatus}',
            status = '${status}',
            updated = getdate(),
            updatedby = '${m_user_id}'
            WHERE klaim_id = '${klaim_id}'`;
        await request.query(updateData);

        let insertAudit = `INSERT INTO audit_klaim (klaim_id,m_user_id,rolename,status) 
            VALUES ('${klaim_id}','${m_user_id}','${rolename}','${status}')`;
        await request.query(insertAudit);

        return res.success({
          message: "Approve successfully",
        });
      } else if (kodeStatusExisting == "MPD") {
        let status = "Dok. Diterima Adm MI, Waiting Verifikasi";
        let kodeStatus = "DTA";

        let updateData = `UPDATE klaim set kode_status = '${kodeStatus}',
            status = '${status}',
            updated = getdate(),
            updatedby = '${m_user_id}'
            WHERE klaim_id = '${klaim_id}'`;
        await request.query(updateData);

        let insertAudit = `INSERT INTO audit_klaim (klaim_id,m_user_id,rolename,status) 
            VALUES ('${klaim_id}','${m_user_id}','${rolename}','${status}')`;
        await request.query(insertAudit);

        return res.success({
          message: "Approve successfully",
        });
      } else if (kodeStatusExisting == "DTA") {
        let status = "Dok. Terverifikasi, Waiting Approval RSM";
        let kodeStatus = "DVS";

        let updateData = `UPDATE klaim set kode_status = '${kodeStatus}',
            status = '${status}',
            updated = getdate(),
            updatedby = '${m_user_id}'
            WHERE klaim_id = '${klaim_id}'`;
        await request.query(updateData);

        let insertAudit = `INSERT INTO audit_klaim (klaim_id,m_user_id,rolename,status) 
            VALUES ('${klaim_id}','${m_user_id}','${rolename}','${status}')`;
        await request.query(insertAudit);

        return res.success({
          message: "Approve successfully",
        });
      } else if (kodeStatusExisting == "DVS") {
        let status = "Waiting Approval Sales Head";
        let kodeStatus = "APR";

        let updateData = `UPDATE klaim set kode_status = '${kodeStatus}',
            status = '${status}',
            updated = getdate(),
            updatedby = '${m_user_id}'
            WHERE klaim_id = '${klaim_id}'`;
        await request.query(updateData);

        let insertAudit = `INSERT INTO audit_klaim (klaim_id,m_user_id,rolename,status) 
            VALUES ('${klaim_id}','${m_user_id}','${rolename}','${status}')`;
        await request.query(insertAudit);

        return res.success({
          message: "Approve successfully",
        });
      } else if (kodeStatusExisting == "APR") {
        let status = "Approval Sales Head";
        let kodeStatus = "APN";

        let updateData = `UPDATE klaim set kode_status = '${kodeStatus}',
            status = '${status}',
            updated = getdate(),
            updatedby = '${m_user_id}'
            WHERE klaim_id = '${klaim_id}'`;
        await request.query(updateData);

        let insertAudit = `INSERT INTO audit_klaim (klaim_id,m_user_id,rolename,status) 
            VALUES ('${klaim_id}','${m_user_id}','${rolename}','${status}')`;
        await request.query(insertAudit);

        return res.success({
          message: "Approve successfully",
        });
      } else if (kodeStatusExisting == "DAD") {
        let status = "Dok Asli diterima ACC MI";
        let kodeStatus = "TDF";

        let updateData = `UPDATE klaim set kode_status = '${kodeStatus}',
            status = '${status}',
            updated = getdate(),
            updatedby = '${m_user_id}'
            WHERE klaim_id = '${klaim_id}'`;
        await request.query(updateData);

        let insertAudit = `INSERT INTO audit_klaim (klaim_id,m_user_id,rolename,status) 
            VALUES ('${klaim_id}','${m_user_id}','${rolename}','${status}')`;
        await request.query(insertAudit);

        return res.success({
          message: "Approve successfully",
        });
      } else if (kodeStatusExisting == "TDF") {
        let kodeStatus = "APF";
        let status = "Waiting Plan Payment";
        let listActivity = [];
        let filename = undefined;
        var uploadFile = req.file("file");
        uploadFile.upload(
          { maxBytes: 500000000000 },
          async function onUploadComplete(err, files) {
            if (err) {
              let errMsg = err.message;
              return res.error(errMsg);
            }

            for (const file of files) {
              // ..disini move ke tempat semestinya
              fs.mkdirSync(dokumentPath("submitfaktur", klaim_id), {
                recursive: true,
              });
              const filesamaDir = glob.GlobSync(
                path.resolve(
                  dokumentPath("klaimproposal", klaim_id),
                  "file_ktp".replace(/\.[^/.]+$/, "")
                ) + "*"
              );
              if (filesamaDir.found.length > 0) {
                fs.unlinkSync(filesamaDir.found[0]);
              }
              fs.renameSync(
                file.fd,
                path.resolve(
                  dokumentPath("klaimproposal", klaim_id),
                  "file_ktp" + getExtOnly(file.filename) /*'file_po'*/
                )
              );
              filename = "file_ktp" + getExtOnly(file.filename);
            }

            try {
              console.log("masuk ke try");

              if(typeof invoice !== 'undefined'){
                if (invoice.length > 16) {
                  return res.error({
                    message: "Invoice DTB tidak boleh lebih dari 16 angka ",
                  });
                }
              }

              if(typeof nomor_faktur !== 'undefined'){
                if (nomor_faktur.length > 25) {
                  return res.error({
                    message: "Nomor Faktur tidak boleh lebih dari 25 karakter",
                  });
                }
              }

              if(typeof perihal_klaim !== 'undefined'){
                if (perihal_klaim.length > 36) {
                  return res.error({
                    message: "Perihal Klaim tidak boleh lebih dari 36 karakter",
                  });
                }
              }

              let setNamaKtp = ``;
              if (nama_ktp && nama_ktp != "null" && nama_ktp != "undefined") {
                let namaktp = nama_ktp;
                namaktp = namaktp
                  .replace(/'/g, `''`)
                  .replace(/"/g, `""`)
                  .replace(/\\/g, `\\`);
                namaktp = `'${namaktp}'`;

                setNamaKtp = `, nama_ktp = ${namaktp} `;
              } else {
                setNamaKtp = `, nama_ktp = NULL`;
              }

              let setNomorKtp = ``;
              if (
                nomor_ktp &&
                nomor_ktp != "null" &&
                nomor_ktp != "undefined"
              ) {
                let nomorktp = nomor_ktp;
                nomorktp = nomorktp
                  .replace(/'/g, `''`)
                  .replace(/"/g, `""`)
                  .replace(/\\/g, `\\`);
                nomorktp = `'${nomorktp}'`;

                setNomorKtp = `, nomor_ktp = ${nomorktp} `;
              } else {
                setNomorKtp = `, nomor_ktp = NULL`;
              }
              console.log("SAMPE SINI");

              let setFileKtp = ``;
              if (filename && filename != "null" && filename != "undefined") {
                setFileKtp = `, file_ktp = '${filename}'`;
              } else {
                setFileKtp = `,file_ktp = NULL`;
              }

              let glid = ``;
              if (r_gl_id && r_gl_id != "null") {
                glid = `, r_gl_id = '${r_gl_id}'`;
              } else {
                glid = `, r_gl_id = NULL`;
              }

              let rpartnerbankkeyid = ``;
              if (r_partner_bank_key_id && r_partner_bank_key_id !== "null") {
                rpartnerbankkeyid = `, r_partner_bank_key_id = '${r_partner_bank_key_id}'`;
              } else {
                rpartnerbankkeyid = `, r_partner_bank_key_id = NULL`;
              }

              let rpaymenttermklaimid = ``;
              if (
                r_payment_term_klaim_id &&
                r_payment_term_klaim_id !== "null"
              ) {
                rpaymenttermklaimid = `, r_payment_term_klaim_id = '${r_payment_term_klaim_id}'`;
              } else {
                rpaymenttermklaimid = `, r_payment_term_klaim_id = NULL`;
              }

              let notedqu = ``;
              if (noted && noted != "" && noted != "null") {
                notedqu = `, noted = '${noted}'`;
              } else {
                notedqu = `, noted = NULL`;
              }

              let valuegl = ``;
              if (value_gl && value_gl != "null") {
                valuegl = `, value_gl = ${value_gl}`;
              } else {
                valuegl = `, value_gl = 0`;
              }

              let arid = ``;
              if (r_ar_id && r_ar_id != "null") {
                arid = `, r_ar_id = '${r_ar_id}'`;
              } else {
                arid = `, r_ar_id = NULL`;
              }

              let valuear = ``;
              if (value_ar && value_ar != "null") {
                valuear = `, value_ar = ${value_ar}`;
              } else {
                valuear = `, value_ar = 0`;
              }

              let nilaipph = ``;
              if (pph) {
                nilaipph = `, pph = ${pph}`;
              } else {
                nilaipph = `, pph = 0`;
              }

              let nilaiopsionalpph = ``;
              if (opsional_pph) {
                nilaiopsionalpph = `, opsional_pph = ${opsional_pph}`;
              } else {
                nilaiopsionalpph = `, opsional_pph = 0`;
              }

              let rpajak = ``;
              if (r_pajak_id && r_pajak_id != "null") {
                rpajak = `, r_pajak_id = '${r_pajak_id}'`;
              } else {
                rpajak = `, r_pajak_id = NULL`;
              }

              let tanggalposting = ``;
              if (tanggal_posting && tanggal_posting != "null") {
                tanggalposting = `, tanggal_posting = '${tanggal_posting}'`;
              } else {
                tanggalposting = `, tanggal_posting = NULL`;
              }

              let r_bank_key = ``;
              if (r_house_bank && r_house_bank != "null") {
                r_bank_key = `, r_house_bank = '${r_house_bank}'`;
              } else {
                r_bank_key = `, r_house_bank = NULL`;
              }

              let setnama_npwp = ``;
              if (
                nama_npwp &&
                nama_npwp != "null" &&
                nama_npwp != "undefined"
              ) {
                let namanpwp = nama_npwp;
                namanpwp = namanpwp
                  .replace(/'/g, `''`)
                  .replace(/"/g, `""`)
                  .replace(/\\/g, `\\`);
                namanpwp = `'${namanpwp}'`;

                setnama_npwp = `, nama_npwp = ${namanpwp} `;
              } else {
                setnama_npwp = `, nama_npwp = NULL `;
              }

              let setnomor_npwp = ``;
              if (
                nomor_npwp &&
                nomor_npwp != "null" &&
                nomor_npwp != "undefined"
              ) {
                let nomornpwp = nomor_npwp;
                nomornpwp = nomornpwp
                  .replace(/'/g, `''`)
                  .replace(/"/g, `""`)
                  .replace(/\\/g, `\\`);
                nomornpwp = `'${nomornpwp}'`;

                setnomor_npwp = `, nomor_npwp = ${nomornpwp} `;
              } else {
                setnomor_npwp = `, nomor_npwp = NULL `;
              }

              let settanggal_faktur_pajak = ``;
              if (
                tanggal_faktur_pajak &&
                tanggal_faktur_pajak != "null" &&
                tanggal_faktur_pajak != "undefined"
              ) {
                settanggal_faktur_pajak = `, tanggal_faktur_pajak = '${tanggal_faktur_pajak}' `;
              } else {
                settanggal_faktur_pajak = `, tanggal_faktur_pajak = NULL `;
              }

              let setnomor_faktur;
              if (
                nomor_faktur &&
                nomor_faktur != "null" &&
                nomor_faktur != "undefined"
              ) {
                let nomorfaktur = nomor_faktur;
                nomorfaktur = nomorfaktur
                  .replace(/'/g, `''`)
                  .replace(/"/g, `""`)
                  .replace(/\\/g, `\\`);
                nomorfaktur = `'${nomorfaktur}'`;

                setnomor_faktur = `, nomor_faktur = ${nomorfaktur} `;
              } else {
                setnomor_faktur = `, nomor_faktur = NULL `;
              }

              let cekPlossa = `SELECT COUNT(1) AS jumlah_record FROM klaim_detail kd WHERE (brand='PLOSS' OR brand='PLOSSA') AND kd.klaim_id = '${klaim_id}'`;
              let dataplosa = await request.query(cekPlossa);
              let plosa = dataplosa.recordset[0].jumlah_record;

              if (plosa > 0) {
                let cekar = `SELECT * FROM r_ar WHERE kode='1151041001'`;
                let dataar = await request.query(cekar);
                let ar = dataar.recordset[0].r_ar_id;
                arid = `, r_ar_id = '${ar}'`;
              }

              let sql = `UPDATE klaim SET updated=getdate(),
                  updatedby = '${m_user_id}',
                  kode_status='${kodeStatus}',
                  status='${status}',
                  invoice = '${invoice}',
                  reason=NULL,
                  nominal_claimable = ${nominal_claimable}
                  ${tanggalposting}
                  ${nilaipph}
                  ${glid}
                  ${valuegl}
                  ${arid}
                  ${valuear}
                  ${setNamaKtp} 
                  ${setNomorKtp} 
                  ${setnama_npwp}
                  ${setnomor_npwp}
                  ${setnomor_faktur}
                  ${settanggal_faktur_pajak}
                  ${setFileKtp}
                  ${rpartnerbankkeyid}
                  ${rpaymenttermklaimid}
                  ${nilaiopsionalpph}
                  ${notedqu}
                  ${rpajak}
                  ${r_bank_key}
                  WHERE klaim_id='${klaim_id}'`;

              console.log("QUERY UPDATE : ", sql);

              request.query(sql, async (err, result) => {
                if (err) {
                  return res.error(err);
                }

                let queryDataTableKlaim = `SELECT kl.klaim_id, kl.isactive, kl.created, kl.createdby, kl.updated, kl.updatedby,
                    kl.proposal_id, kl.nomor_proposal, kl.nomor_klaim, kl.title, kl.date_prop, kl.company, kl.region, kl.status,
                    kl.file_invoice, kl.file_surat_klaim_sesuai_prinsiple, kl.file_faktur_pajak, kl.file_eproposal,
                    kl.file_ktp, kl.file_rekap_klaim, kl.file_copy_faktur, kl.file_skp, kl.nomor_ktp, kl.nama_ktp,
                    kl.nomor_npwp, kl.nama_npwp, kl.nomor_faktur, kl.tipe_pajak, kl.tanggal_faktur_pajak,kl.tanggal_posting,kl.r_pajak_id,
                    kl.company_list AS company_code, kl.total_klaim, kl.nominal_pajak,
                    kl.nominal_claimable, kl.perihal_klaim, kl.kode_status,kl.tanggal_invoice,kl.value_gl,
                    mdv.r_organisasi_id,mdv.kode AS kode_pajak,ro.nama,kl.divisi,kl.reason,kl.r_gl_id,kl.r_costcenter_id,kl.r_ar_id,kl.value_ar,kl.pph,
                    kl.r_partner_bank_key_id,kl.r_payment_term_klaim_id,kl.sales_approve_amount,kl.asdh_approve_amount,kl.m_distributor_id,
                    kl.accounting_document_number,kl.fiscal_year,kl.opsional_pph,kl.noted,kv.r_distribution_channel_id
                    FROM klaim kl
                    LEFT JOIN  m_pajak mdv ON(mdv.m_pajak_id = kl.m_pajak_id)
                    LEFT JOIN  klaim_v kv ON(kv.klaim_id = kl.klaim_id)
                    LEFT JOIN  r_organisasi ro ON(ro.r_organisasi_id = mdv.r_organisasi_id)
                    WHERE kl.klaim_id = '${klaim_id}'`;

                let queryDataTableKlaimDetail = `SELECT *
                    FROM klaim_detail WHERE klaim_id = '${klaim_id}'`;

                let data_klaim = await request.query(queryDataTableKlaim);
                let klaim = data_klaim.recordset[0];
                //let kode_pajak = data_klaim.recordset[0].kode_pajak;
                //let nomor_proposal = data_klaim.recordset[0].nomor_proposal;
                let nomor_klaim = data_klaim.recordset[0].nomor_klaim;
                let tanggal_invoice = data_klaim.recordset[0].tanggal_invoice;
                let r_distribution_channel_id =
                  data_klaim.recordset[0].r_distribution_channel_id;
                let m_distributor_id = data_klaim.recordset[0].m_distributor_id;
                let sales_approve_amount =
                  data_klaim.recordset[0].sales_approve_amount;
                let total_klaim = data_klaim.recordset[0].total_klaim;

                let data_klaimdetail = await request.query(
                  queryDataTableKlaimDetail
                );
                let klaimdetail = data_klaimdetail.recordset;

                klaim.lines = klaimdetail;
                let region_desc = klaimdetail[0].region_id;
                let sqlgetregionid = `SELECT * FROM r_region WHERE kode = '${region_desc}'`;
                let dataregion = await request.query(sqlgetregionid);
                let nama_region = dataregion.recordset[0].nama;
                let r_region_id = dataregion.recordset[0].r_region_id;

                klaim.nama_region = nama_region;

                let getdataemail =
                  await request.query(`SELECT email_verifikasi FROM email_klaim 
                    WHERE r_distribution_channel_id='${r_distribution_channel_id}' AND r_region_id='${r_region_id}'  AND isemail_klaim = 'Y'`);

                let dataemail = [];
                for (let i = 0; i < getdataemail.recordset.length; i++) {
                  dataemail.push(getdataemail.recordset[i].email_verifikasi);
                }

                let getdataemail2 = await request.query(
                  `SELECT * FROM email_distributor WHERE tipe = 'KLAIM' AND m_distributor_id='${m_distributor_id}'`
                );

                for (let i = 0; i < getdataemail2.recordset.length; i++) {
                  dataemail.push(getdataemail2.recordset[i].email_verifikasi);
                }

                let listActivityUnique = _.uniq(listActivity);
                dataemail = _.uniq(dataemail);
                const amountKlaim = numeral(nominal_claimable)
                  .format("0,0")
                  .replace(/,/g, ".");

                let sqlgetdistributor = `SELECT * FROM m_distributor_v mdv WHERE mdv.m_distributor_id = '${m_distributor_id}'`;
                let datadistributor = await request.query(sqlgetdistributor);
                let nama_pemohon = "";
                if (datadistributor.length > 0) {
                  nama_pemohon = datadistributor.recordset[0].nama;
                }

                if (dataemail.length > 0) {
                  const param = {
                    subject: "Approve Klaim Proposal",
                    nomor_proposal: nomor_klaim,
                    activity: listActivityUnique.toString(),
                    distributor: nama_pemohon,
                    tanggal_pengajuan: tanggal_invoice,
                    nominal_klaim: `Rp. ${total_klaim}`,
                    nominal_approve: `Rp. ${sales_approve_amount}`,
                  };

                  let sqlgetstatusIntegasi = `SELECT TOP 1 * FROM integration_url ORDER BY created DESC`;
                  let datastatusIntegasi = await request.query(
                    sqlgetstatusIntegasi
                  );
                  let statusIntegasi =
                    datastatusIntegasi.recordset.length > 0
                      ? datastatusIntegasi.recordset[0].status
                      : "DEV";

                  if (statusIntegasi == "DEV") {
                    dataemail = [];
                    dataemail.push("tiasadeputra@gmail.com");
                  }

                  const template = await sails.helpers.generateHtmlEmail.with({
                    htmltemplate: "klaimproposal",
                    templateparam: param,
                  });
                  SendEmail(dataemail.toString(), param.subject, template);
                }

                let insertAudit = `INSERT INTO audit_klaim (klaim_id,m_user_id,rolename,status) 
                  VALUES ('${klaim_id}','${m_user_id}','${rolename}','${status}')`;
                await request.query(insertAudit);

                return res.success({
                  message: "Approve successfully",
                });
              });
            } catch (err) {
              return res.error(err);
            }
          }
        );
      } else {
        return res.error({
          message: "Approve atau verifikasi gagal",
        });
      }
    } catch (err) {
      return res.error(err);
    }
  },

  pengiriman_dokument: async function (req, res) {
    const { m_user_id, klaim_id, nomor_resi, jasa_pengiriman, penerima } =
      req.body;

    try {
      console.log(m_user_id, klaim_id, nomor_resi, jasa_pengiriman, penerima);
      await DB.poolConnect;
      const request = DB.pool.request();

      let sel = `SELECT b.kode_region,b.r_distribution_channel_id FROM klaim k 
        INNER JOIN m_distributor_v  b ON b.m_distributor_id = k.m_distributor_id 
        WHERE k.klaim_id = '${klaim_id}'`;
      let res_sel = await request.query(sel);
      res_sel = res_sel.recordset[0];

      let kode_region = res_sel.kode_region;
      let r_distribution_channel_id = res_sel.r_distribution_channel_id;

      let upd = `UPDATE klaim set kode_status = 'MPD', status = 'Menunggu Penerimaan Dok Klaim DTB' 
    ,nomor_resi = '${nomor_resi}', jasa_pengiriman = '${jasa_pengiriman}', penerima = '${penerima}'
    ,updated = getdate()
    ,updatedby = '${m_user_id}'  
    WHERE klaim_id = '${klaim_id}'`;

      request.query(upd, (err, result) => {
        if (err) {
          return res.error(err);
        }
        updatenotifikasi(klaim_id, kode_region, r_distribution_channel_id);

        let ins = `INSERT INTO audit_klaim (klaim_id,m_user_id,rolename,status)
        VALUES ('${klaim_id}','${m_user_id}','DISTRIBUTOR','Menunggu Penerimaan Dok Klaim DTB')`;
        request.query(ins);

        return res.success({
          data: result,
          message: "Update data successfully",
        });
      });
    } catch (error) {
      console.log(error);
      return res.error(error);
    }
  },
  rejectKlaim: async function (req, res) {
    const { m_user_id, klaim_id, reason } = req.body;
    await DB.poolConnect;
    try {
      const request = DB.pool.request();

      let cekPosisi = `SELECT b.nama FROM m_user a
                    INNER JOIN m_role b ON a.role_default_id = b.m_role_id
                    WHERE a.m_user_id  = '${m_user_id}'`;
      let resPosisi = await request.query(cekPosisi);
      let dataposisi = resPosisi.recordset;

      let region = `SELECT  top 1 m_distributor_id,r_distribution_channel_id,b.r_region_id,a.kode as soldto,* FROM klaim_v a
            INNER JOIN r_region b ON a.kode_region = b.kode
            WHERE klaim_id = '${klaim_id}'`;
      let resRegion = await request.query(region);
      let dataRegion = resRegion.recordset;

      let channel = dataRegion[0].r_distribution_channel_id;
      let regionid = dataRegion[0].r_region_id;
      let kodeSoldto = dataRegion[0].soldto;
      let nomor_klaim = dataRegion[0].nomor_klaim;
      let total_klaim = dataRegion[0].total_klaim + dataRegion[0].nominal_pajak;
      let m_dist_id = dataRegion[0].m_distributor_id;
      let kode_status = dataRegion[0].kode_status;
      let rolename = dataposisi[0].nama;
      let alasan = `${reason}`;

      console.log(dataRegion[0].m_distributor_id);
      let sql = "";
      let dataemail3 = [];

      let status_reject = "REJECT";
      let pos = dataposisi[0].nama;
      if (
        pos == `SALESMTREGIONKLAIM` ||
        pos == `SALESGTREGIONKLAIM` ||
        rolename == "SALEADMINFKR" ||
        rolename == "EXECUTOR-EPROP" ||
        rolename == "ADMIN-ERPOP" ||
        rolename == "APPROVAL-EPROP" ||
        rolename == "NONESALES"
      ) {
        status_reject = status_reject + " BY ADMIN MI";
      } else if (pos == "RSDH") {
        status_reject = status_reject + " RSM";
      } else if (pos == "ACCOUNTING2" || pos == "ACCOUNTING1") {
        status_reject = status_reject + " BY ACCOUNTING MI";
      }

      // console.log("masuk sini ga ???");
      sql = `UPDATE klaim SET updated=getdate(),
        updatedby = '${m_user_id}',
        kode_status='RJF',
        status='${status_reject}',
        reason='${reason}',
        tgl_reject= getdate()
        WHERE klaim_id='${klaim_id}'`;

      request.query(sql, async (err, result) => {
        if (err) {
          return res.error(err);
        }

        await updatenotifikasi_reject(
          klaim_id,
          m_user_id,
          status_reject,
          rolename
        );

        let insrjc = `INSERT INTO reject_klaim_log
      (klaim_id,m_user_id,createddate,alasan)
      VALUES ('${klaim_id}','${m_user_id}',getdate(),'${reason}')`;
        await request.query(insrjc);

        const param = {
          subject: status_reject,
          nomor_proposal: nomor_klaim,
          nominal_klaim: `Rp. ${total_klaim}`,
          alasan: alasan,
        };

        let sqlgetstatusIntegasi = `SELECT TOP 1 * FROM integration_url ORDER BY created DESC`;
        let datastatusIntegasi = await request.query(sqlgetstatusIntegasi);
        let statusIntegasi =
          datastatusIntegasi.recordset.length > 0
            ? datastatusIntegasi.recordset[0].status
            : "DEV";

        let selEmail = `SELECT * FROM email_distributor ed WHERE tipe = 'KLAIM'
      AND m_distributor_id = '${m_dist_id[0]}'`;

        // console.log(selEmail);

        let dtEmail = await request.query(selEmail);
        if (dtEmail.recordset.length > 0) {
          let dts = dtEmail.recordset;
          for (let i = 0; i < dtEmail.recordset.length; i++) {
            console.log(dts[i].email_verifikasi);
            // dataemail3.push('ilyas.nurrahman74@gmail.com')
            dataemail3.push(dts[i].email_verifikasi);
          }
        }

        // if(statusIntegasi=='DEV'){

        //   dataemail3 = [];
        //   dataemail3.push('suandiindra@gmail.com')

        // }

        const template = await sails.helpers.generateHtmlEmail.with({
          htmltemplate: "rejectklaim",
          templateparam: param,
        });
        SendEmail(dataemail3.toString(), param.subject, template);

        // console.log();

        return res.success({
          data: result,
          message: "Reject Klaim successfully",
        });
      });
    } catch (err) {
      return res.error(err);
    }
  },
  submitKlaim: async function (req, res) {
    const {
      m_user_id,
      klaim_id,
      noted,
      tanggal_posting,
      r_partner_bank_key_id,
      r_payment_term_klaim_id,
      r_house_bank,
      invoice,
      nomor_faktur,
    } = req.body;
    // console.log(req.body);
    await DB.poolConnect;
    const request = DB.pool.request();

    console.log("m_user_id", m_user_id);
    if (!r_house_bank) {
      return res.error({
        message: "House Bank harus diisi",
      });
    }

    if (!invoice) {
      return res.error({
        message: "Invoice harus diisi",
      });
    }

    if (nomor_faktur) {
      if (nomor_faktur.length > 19) {
        return res.error({
          message: "Nomor Faktur terlalu panjang maksimal hanya 19 Karakter",
        });
      }

      let updateDataNomorFaktur = `UPDATE klaim SET nomor_faktur = '${nomor_faktur}' WHERE klaim_id = '${klaim_id}'`;
      await request.query(updateDataNomorFaktur);
    }

    try {



      let sqlCheckSubmitKlaim = `SELECT COUNT(1) AS jumlahData FROM log_submit_klaim kas WHERE klaim_id = '${klaim_id}'`;
      let dataCheckSubmitKlaim = await request.query(sqlCheckSubmitKlaim);
      let jumlahData = dataCheckSubmitKlaim.recordset.length > 0 ? dataCheckSubmitKlaim.recordset[0].jumlahData : 0;

      if(jumlahData > 0){
        return res.error({
          message: "Submit klaim sudah pernah dilakukan untuk mencegah double posting maka submit klaim tidak diizinkan harap lapor ke team IT untuk proses pengecekan",
        });
      }

      let sqlgetstatusIntegasi = `SELECT TOP 1 * FROM integration_url ORDER BY created DESC`;
      let datastatusIntegasi = await request.query(sqlgetstatusIntegasi);
      let statusIntegasi =
        datastatusIntegasi.recordset.length > 0
          ? datastatusIntegasi.recordset[0].status
          : "DEV";

      let url = ``;

      let usernamesoap = sails.config.globals.usernamesoap;
      let passwordsoap = sails.config.globals.passwordsoap;
      console.log(passwordsoap);

      if (statusIntegasi == "DEV") {
        url =
          "http://sapdevene.enesis.com:8010/sap/bc/srt/rfc/sap/zws_ws_claim_new/120/zws_ws_claim_new/zbn_ws_claim_new";
        usernamesoap = sails.config.globals.usernamesoapdev;
        passwordsoap = sails.config.globals.passwordsoapdev;
      } else {
        url =
          "http://sapprdene.enesis.com:8310/sap/bc/srt/rfc/sap/zws_ws_claim_new/300/zws_ws_claim_new/zbn_ws_claim_new"; // production
      }

      const tok = `${usernamesoap}:${passwordsoap}`;
      const hash = Base64.encode(tok);
      const Basic = "Basic " + hash;
      let datasheader = [];
      let datasdetail = [];

      let sqlgetheader = `SELECT * FROM klaim_header_to_sap_v WHERE klaim_id='${klaim_id}'`;
      // console.log(sqlgetheader);
      let headerresult = await request.query(sqlgetheader);
      let headertempdata = headerresult.recordset[0];

      let payterm = `SELECT * FROM r_payment_term_klaim WHERE r_payment_term_klaim_id = '${r_payment_term_klaim_id}'`;
      // console.log(payterm);

      let dsPayterm = await request.query(payterm);
      let dataPayterm = dsPayterm.recordset[0].kode;

      let bankKey = `SELECT * FROM r_partner_bank_key WHERE r_partner_bank_key_id = '${r_partner_bank_key_id}'`;
      // console.log(bankKey);
      let dsbankKey = await request.query(bankKey);
      let databankKey = dsbankKey.recordset[0].part_bank_key;

      let bldate = moment(headertempdata.tanggal_invoice, "YYYY-MM-DD").format(
        "DD.MM.YYYY"
      );
      let budate = moment(tanggal_posting, "YYYY-MM-DD").format("DD.MM.YYYY");
      let fiscal_year = moment(tanggal_posting, "YYYY-MM-DD").format("YYYY");

      let r_gl_id = headertempdata.r_gl_id;
      let r_ar_id = headertempdata.r_ar_id;
      let value_gl = headertempdata.value_gl;
      let value_ar = headertempdata.value_ar;
      let r_costcenter_id = headertempdata.r_costcenter_id;
      let nominal_pajak = headertempdata.nominal_pajak;
      //let profit_center = headertempdata.profit_center;
      let m_distributor_id = headertempdata.m_distributor_id;
      let nama_shipto = headertempdata.nama_shipto;
      let tanggal_invoice = headertempdata.tanggal_invoice;

      let reference1 = headertempdata.reference1;
      let reference2 = headertempdata.reference2;
      let reference3 = headertempdata.reference3;

      let sqlgetdetailactivity = `SELECT * FROM klaim_activity_to_sap_v WHERE klaim_id='${klaim_id}'`;
      //console.log(sqlgetdetailactivity);
      let detailactivityresult = await request.query(sqlgetdetailactivity);
      let detailactivitytempdata = detailactivityresult.recordset;
      //console.log(detailactivitytempdata);

      let totalKlaim = 0;
      let tottlklaimx = 0;
      let line = 0;
      let listActivity = [];
      let listNomorProposal = [];



      let percentagePpn = 0;
      if (headertempdata.kode_pajak == 'V1') {
        percentagePpn = 10;
      } else if (headertempdata.kode_pajak == 'V2') {
        percentagePpn = 1;
      } else if (headertempdata.kode_pajak == 'V3') {
        percentagePpn = 11;
      } else if (headertempdata.kode_pajak == 'V4') {
        percentagePpn = 1.1;
      }


      let sqlgetcekdetailactivity = `SELECT * FROM klaim_activity_to_sap_v WHERE klaim_id='${klaim_id}' AND reference2 is null`;
      let detailcekactivityresult = await request.query(
        sqlgetcekdetailactivity
      );
      let detailcekactivitytempdata = detailcekactivityresult.recordset;

      if (detailactivitytempdata.length == 0) {
        console.log("Masuk sini 3");
        return res.error({
          message: `Nilai Approval Sales Region 0, atau mapping kode GL belum tersedia Tidak Bisa Submit SAP`,
        });
      } else if (detailcekactivitytempdata.length > 0) {
        return res.error({
          message: `Kode Brand tidak tersedia cek data di referensi table Brand`,
        });
      } else {
        let nomorx =
          detailactivitytempdata.length > 0
            ? detailactivitytempdata[0].nomor_proposal
            : "";

        console.log("MASUK 2");
        for (let i = 0; i < detailactivitytempdata.length; i++) {
          line = line + 1;
          totalKlaim = totalKlaim + detailactivitytempdata[i].total_klaim;

          let totalpajak = 0;
          if (nominal_pajak > 0) {
            totalpajak = percentagePpn > 0 ? (Number(detailactivitytempdata[i].total_klaim) * percentagePpn ) / 100 : 0;
          }
          let all = totalpajak + detailactivitytempdata[i].total_klaim;
          let all2 = detailactivitytempdata[i].total_klaim;

          let activity = detailactivitytempdata[i].activity;

          let nomor_proposal = detailactivitytempdata[i].nomor_proposal;
          // nomorx = detailactivitytempdata[i].nomor_proposal;

          let panjang = nomor_proposal.length;
          let ref1 = nomor_proposal.substring(20, panjang);
          let ref3 = nomor_proposal.substring(0, 20);
          let finalamount = Math.round(all);
          let finalamount_detail = Math.round(all2);
          tottlklaimx = tottlklaimx + finalamount;

          // tambah logic plossa
          let sei = false;
          let hi = false;
          let prof_center = detailactivitytempdata[i].profit_center;
          let new_hkont = detailactivitytempdata[i].activity_code;
          if (detailactivitytempdata[i].nomor_proposal.includes("SEI")) {
            sei = true;
          }
          if (detailactivitytempdata[i].nomor_proposal.includes("HI")) {
            hi = true;
          }

          if (detailactivitytempdata[i].reference2 == "00012" && sei == true) {
            prof_center = "120000";
          }

          if (detailactivitytempdata[i].reference2 == "00012" && hi == true) {
            new_hkont = "1151041001";
          }

          let strData = headertempdata.nomor_klaim;
          // console.log(str);
          let kodeData =
            strData.split("/").length == 5
              ? strData.split("/")[4]
              : strData.split("/")[3];
          let sequenceidData =
            strData.split("/").length == 5
              ? strData.split("/")[4]
              : strData.split("/")[5];
          let combinenomorklaimData = kodeData + "/" + sequenceidData;

          let catatan = noted
            ? (combinenomorklaimData + "|" + noted).substring(0, 50)
            : (combinenomorklaimData + "|" + headertempdata.noted).substring(
                0,
                50
              );

          datasdetail.push({
            LINE: line,
            HKONT: new_hkont,
            WRBTR: finalamount_detail,
            ZUONR: "",
            SGTXT: catatan,
            PRCTR: prof_center,
            XREF1: ref1,
            XREF2: detailactivitytempdata[i].reference2,
            XREF3: ref3,
            KOSTL: detailactivitytempdata[i].costcenter,
          });

          listActivity.push(activity);
          listNomorProposal.push(nomor_proposal);

          // console.log("###############1",r_gl_id,value_gl);

          if (r_gl_id && Number(value_gl) > 0) {
            line = line + 1;

            let sqlgetgl = `SELECT kode FROM r_gl WHERE r_gl_id='${r_gl_id}'`;
            console.log("###############1", sqlgetgl);

            let glresult = await request.query(sqlgetgl);
            let activity_code =
              glresult.recordset.length > 0 ? glresult.recordset[0].kode : "";

            let sqlgetdatacostcenter = `SELECT kode FROM r_costcenter WHERE r_costcenter_id='${r_costcenter_id}'`;

            let costcenterresult = await request.query(sqlgetdatacostcenter);
            let costcenter =
              costcenterresult.recordset.length > 0
                ? costcenterresult.recordset[0].kode
                : "";

            console.log("MASUK SINI GAK ???????/// ");
            totalKlaim = totalKlaim + Number(value_gl);

            console.log("###############2", sqlgetgl);

            // tambah logic plossa

            let sei = false;
            let hi = false;
            let new_hkont = activity_code;
            if (detailactivitytempdata[i].nomor_proposal.includes("SEI")) {
              sei = true;
            }
            if (detailactivitytempdata[i].nomor_proposal.includes("HI")) {
              hi = true;
            }
            console.log("###############1", r_gl_id, value_gl);

            if (
              detailactivitytempdata[i].reference2 == "00012" &&
              sei == true
            ) {
              prof_center = "120000";
            }

            if (detailactivitytempdata[i].reference2 == "00012" && hi == true) {
              new_hkont = "1151041001";
            }

            datasdetail.push({
              LINE: line,
              HKONT: new_hkont,
              WRBTR: parseInt(value_gl),
              ZUONR: "",
              SGTXT: "",
              PRCTR: "",
              XREF1: reference1,
              XREF2: reference2,
              XREF3: reference3,
              KOSTL: costcenter,
            });
          }
        }

        console.log("r_ar_id : ", r_ar_id);
        console.log("value_ar : ", value_ar);
        if (r_ar_id && Number(value_ar) > 0) {
          line = line + 1;

          let sqlgetar = `SELECT kode FROM r_ar WHERE r_ar_id='${r_ar_id}'`;
          let arresult = await request.query(sqlgetar);
          let activity_code =
            arresult.recordset.length > 0 ? arresult.recordset[0].kode : "";

          let sqlgetdatacostcenter = `SELECT kode FROM r_costcenter WHERE r_costcenter_id='${r_costcenter_id}'`;
          let costcenterresult = await request.query(sqlgetdatacostcenter);
          let costcenter =
            costcenterresult.recordset.length > 0
              ? costcenterresult.recordset[0].kode
              : "";

          totalKlaim = totalKlaim + Number(value_ar);
          datasdetail.push({
            LINE: line,
            HKONT: activity_code,
            WRBTR: value_ar,
            ZUONR: "",
            SGTXT: "",
            PRCTR: "",
            XREF1: reference1,
            XREF2: reference2,
            XREF3: reference3,
            KOSTL: costcenter,
          });
        }

        if (nominal_pajak > 0) {
          totalKlaim = totalKlaim + nominal_pajak;
        }
        console.log(">>>>>>>>>>>>>>>>>>>>>>>>>>>>> Testing");
        let str = headertempdata.nomor_klaim;
        let kode =
          str.split("/").length == 5 ? str.split("/")[4] : str.split("/")[3];
        let sequenceid =
          str.split("/").length == 5 ? str.split("/")[4] : str.split("/")[5];
        let combinenomorklaim = kode + "/" + sequenceid;

        try {
          datasheader.push({
            LIFNR: headertempdata.kode_soldto,
            ZTERM: dataPayterm,
            ZFBDT: budate, //Bline Date ( tanggal posting )
            BVTYP: databankKey,
            BLDAT: bldate, //Doc Date ( tanggal dokumen / invoice)
            BUDAT: budate, //Posting Date ( tanggal posting )
            WRBTR: Math.round(tottlklaimx),
            WAERS: headertempdata.currency,
            MWSKZ: headertempdata.kode_pajak,
            XBLNR: invoice.substring(0, 16),
            BKTXT: headertempdata.nomor_faktur
              ? headertempdata.nomor_faktur
              : "",
            SGTXT_VENDOR: noted
              ? (combinenomorklaim + "|" + noted).substring(0, 50)
              : (combinenomorklaim + "|" + headertempdata.noted).substring(
                  0,
                  50
                ),
            LINE: headertempdata.line ? headertempdata.line : "",
            WT_WITHCD: headertempdata.kode_pph,
            WT_QSSHB: headertempdata.kode_pph
              ? Number(headertempdata.tax_base_pph)
              : "",
            WT_QBSHB: headertempdata.kode_pph ? headertempdata.pph : "",
            BUKRS:
              datasdetail.length > 0
                ? datasdetail[0].PRCTR.substring(0, 4)
                : "",
          });
        } catch (error) {
          console.log(error);
        }

        console.log("pcxp");

        let xml = fs.readFileSync("soap/ZFM_WS_CLAIM_NEW.xml", "utf-8");
        let header = racikXMLHeader(xml, datasheader, "HEADER");

        let detail = racikXMLDetail(header, datasdetail, "DETAIL");

        //header dan detail ini data yg bakal di kirim ke SAP, kita liat pph nya ada dimana
        // console.log("HEADER TO SAP : ", header);
        // console.log("DETAIL TO SAP", detail);

      
        let sampleHeaders = {
          Authorization: Basic,
          "user-agent": "esalesSystem",
          "Content-Type": "text/xml;charset=UTF-8",
          soapAction:
            "urn:sap-com:document:sap:rfc:functions:ZWS_SALES_CLAIM:ZFM_WS_CLAIMRequest",
        };

        let { response } = await soapRequest({
          url: url,
          headers: sampleHeaders,
          xml: detail,
          timeout: 1000000,
        }); // Optional timeout parameter(milliseconds)
        let { body, statusCode, statusText } = response;

        // console.log(response.body);
        let str_response = JSON.stringify(response);
        console.log("log response", str_response);
        console.log("statusText ", statusText);
        console.log("statusCode ", statusCode);


        let insertlog = `INSERT INTO log_submit_klaim (klaim_id,log_header,log_detail,nomor_klaim,log_response)
        VALUES ('${klaim_id}','${header}','${detail}','${nomorx}','${str_response}')`;

        console.log("insertlog : ", insertlog);
        await request.query(insertlog);

        if (statusCode == 200) {
          let dataError = [];
          var parser = new xml2js.Parser({ explicitArray: false });
          parser.parseString(body, async function (err, result) {
            if (err) {
              return res.error({
                message: err,
              });
            }
            //console.log(result['soap-env:Envelope']['soap-env:Body']['n0:ZFM_WS_CLAIM_NEWResponse'].OUT_RETURN);

            let OUT_RETURN =
              result["soap-env:Envelope"]["soap-env:Body"][
                "n0:ZFM_WS_CLAIM_NEWResponse"
              ].OUT_RETURN;
            if (OUT_RETURN) {
              let itemError = OUT_RETURN.item;

              for (let i = 0; i < itemError.length; i++) {
                dataError.push(itemError[i].MESSAGE);
              }
            }

            let BELNR =
              result["soap-env:Envelope"]["soap-env:Body"][
                "n0:ZFM_WS_CLAIM_NEWResponse"
              ].BELNR;
            console.log("BELNR ", BELNR);
            if (BELNR == "$" || BELNR == "") {
              console.log("ERROR APA ? ", dataError.toString());
              return res.error({
                message: dataError.toString(),
              });
            }
            if (BELNR.toUpperCase() == "ERROR") {
              return res.error({
                message: err,
              });
            } else {
              let notedqu = ``;
              if (noted && noted != "" && !noted != "null") {
                notedqu = `, noted = '${noted}'`;
              } else {
                notedqu = ``;
              }

              const sql = `UPDATE klaim SET updated=getdate(),
              updatedby = '${m_user_id}',
              kode_status='SKP',
              status='Submit Klaim to SAP',
              reason=NULL,
              invoice = '${invoice}',
              tanggal_posting = '${tanggal_posting}',
              r_partner_bank_key_id = '${r_partner_bank_key_id}',
              r_payment_term_klaim_id = '${r_payment_term_klaim_id}',
              accounting_document_number = '${BELNR}',
              fiscal_year='${fiscal_year}'
              ${notedqu}
              WHERE klaim_id='${klaim_id}'`;
              console.log(sql);

              request.query(sql, async (err, result) => {
                if (err) {
                  return res.error(err);
                }

                const insertAudit = `INSERT INTO klaim_audit_soap
              (createdby, updatedby, klaim_id, soap_format)
              VALUES('${m_user_id}', '${m_user_id}', '${klaim_id}', '${detail}')`;
                await request.query(insertAudit);
        

                let insertKlaim = `INSERT INTO audit_klaim
                (klaim_id, m_user_id, rolename, status)
                VALUES('${klaim_id}', '${m_user_id}','ACCOUNTING', 'Submit Klaim to SAP')`;
                await request.query(insertKlaim);

                let getdataemail = await request.query(
                  `SELECT * FROM email_distributor WHERE tipe='KLAIM' AND m_distributor_id='${m_distributor_id}'`
                );

                let dataemail = [];
                for (let i = 0; i < getdataemail.recordset.length; i++) {
                  dataemail.push(getdataemail.recordset[i].email_verifikasi);
                }

                listActivity = _.uniq(listActivity);
                dataemail = _.uniq(dataemail);

                if (dataemail.length > 0) {
                  const param = {
                    subject: "Klaim Submit to SAP",
                    nomor_proposal: listNomorProposal.toString(),
                    activity: listActivity.toString(),
                    distributor: nama_shipto,
                    tanggal_pengajuan: tanggal_invoice,
                    nominal_klaim: `Rp. ${totalKlaim}`,
                  };

                  let sqlgetstatusIntegasi = `SELECT TOP 1 * FROM integration_url ORDER BY created DESC`;
                  let datastatusIntegasi = await request.query(
                    sqlgetstatusIntegasi
                  );
                  let statusIntegasi =
                    datastatusIntegasi.recordset.length > 0
                      ? datastatusIntegasi.recordset[0].status
                      : "DEV";

                  if (statusIntegasi == "DEV") {
                    dataemail = [];
                    dataemail.push("tiasadeputra@gmail.com");
                  }

                  const template = await sails.helpers.generateHtmlEmail.with({
                    htmltemplate: "klaimproposal",
                    templateparam: param,
                  });
                  SendEmail(dataemail.toString(), param.subject, template);
                }

                return res.success({
                  data: result,
                  message: `Submit klaim to SAP successfully ( ${BELNR} )`,
                });
              });
            }
          });
        } else {
          return res.error({
            message: `Status ${statusCode} ${statusText}`,
          });
        }
      }
    } catch (err) {
      return res.error({
        message: err,
      });
    }
  },
  findpartnerkey: async function (req, res) {
    await DB.poolConnect;
    try {
      const request = DB.pool.request();

      let queryDataTable = `SELECT * FROM r_partner_bank_key WHERE kode_vendor='${req.param(
        "kode"
      )}' ORDER BY part_bank_key `;

      console.log(queryDataTable);

      request.query(queryDataTable, (err, result) => {
        if (err) {
          return res.error(err);
        }

        const rows = result.recordset;
        return res.success({
          result: rows,
          message: "Fetch data successfully",
        });
      });
    } catch (err) {
      return res.error(err);
    }
  },

  findpartnerpaymentterm: async function (req, res) {
    await DB.poolConnect;
    try {
      const request = DB.pool.request();

      let queryDataTable = `SELECT * FROM r_payment_term_klaim ORDER BY kode `;

      request.query(queryDataTable, (err, result) => {
        if (err) {
          return res.error(err);
        }

        const rows = result.recordset;
        return res.success({
          result: rows,
          message: "Fetch data successfully",
        });
      });
    } catch (err) {
      return res.error(err);
    }
  },

  statusBayarKlaim: async function (req, res) {
    const { m_user_id, klaim_id } = req.body;
    await DB.poolConnect;
    try {
      const request = DB.pool.request();

      let sql = `UPDATE klaim SET updated=getdate(),
    updatedby = '${m_user_id}',
    kode_status='PAY',status='Payment Completed'
    WHERE klaim_id='${klaim_id}'`;

      request.query(sql, (err, result) => {
        if (err) {
          return res.error(err);
        }
        return res.success({
          data: result,
          message: "Payment Klaim Update successfully",
        });
      });
    } catch (err) {
      return res.error(err);
    }
  },

  delete: async function (req, res) {
    const { klaim_id } = req.body;
    await DB.poolConnect;
    try {
      const request = DB.pool.request();

      const sqlgetklaim = `SELECT kode_status FROM klaim_v WHERE klaim_id = '${klaim_id}'`;
      const dataklaim = await request.query(sqlgetklaim);
      const klaim = dataklaim.recordset[0];

      const kode_status = klaim.kode_status;
      if (kode_status == "VER") {
        return res.error({
          message: "Status klaim dalam proses verifikasi",
        });
      } else if (kode_status == "APS") {
        return res.error({
          message: "Status klaim sudah approve sales region",
        });
      } else if (kode_status == "APF") {
        return res.error({
          message: "Status klaim sudah approve finance",
        });
      } else if (kode_status == "SKP") {
        return res.error({
          message: "Status klaim sudah disubmit ke SAP",
        });
      } else if (kode_status == "PAY") {
        return res.error({
          message: "Status klaim sudah dilakukan pembayaran",
        });
      }

      let sql = `DELETE FROM klaim WHERE klaim_id = '${klaim_id}'`;

      request.query(sql, (err, result) => {
        if (err) {
          return res.error(err);
        }
        return res.success({
          data: result,
          message: "Delete Klaim successfully",
        });
      });
    } catch (err) {
      return res.error(err);
    }
  },

  verify: async function (req, res) {
    const { m_user_id, klaim_id, noted } = req.body;

    // return res.error("woookee");
    await DB.poolConnect;
    try {
      const request = DB.pool.request();

      let queryDataTableKlaim = `SELECT kl.klaim_id, kl.isactive, kl.created, kl.createdby, kl.updated, kl.updatedby, 
      kl.proposal_id, kl.nomor_proposal, kl.nomor_klaim, kl.title, kl.date_prop, kl.company, kl.region, kl.status, 
      kl.file_invoice, kl.file_surat_klaim_sesuai_prinsiple, kl.file_faktur_pajak, kl.file_eproposal, 
      kl.file_ktp, kl.file_rekap_klaim, kl.file_copy_faktur, kl.file_skp, kl.nomor_ktp, kl.nama_ktp, 
      kl.nomor_npwp, kl.nama_npwp, kl.nomor_faktur, kl.tipe_pajak, kl.tanggal_faktur_pajak,kl.tanggal_posting,kl.r_pajak_id,
      kl.company_list AS company_code, kl.total_klaim, kl.nominal_pajak,
      kl.nominal_claimable, kl.perihal_klaim, kl.kode_status,kl.tanggal_invoice,kl.value_gl,
      mdv.r_organisasi_id,mdv.kode AS kode_pajak,ro.nama,kl.divisi,kl.reason,r_gl_id,r_costcenter_id,r_ar_id,value_ar,pph,
      kl.r_partner_bank_key_id,kl.r_payment_term_klaim_id,kl.sales_approve_amount,kl.asdh_approve_amount,
      kl.accounting_document_number,kl.fiscal_year,kl.opsional_pph,kl.noted,kl.r_distribution_channel_id
      FROM klaim kl 
      LEFT JOIN  m_pajak mdv ON(mdv.m_pajak_id = kl.m_pajak_id)
      LEFT JOIN  r_organisasi ro ON(ro.r_organisasi_id = mdv.r_organisasi_id)
      WHERE kl.klaim_id ='${klaim_id}'`;

      let queryDataTableKlaimDetail = `SELECT * FROM klaim_detail WHERE klaim_id = '${klaim_id}'`;

      let data_klaim = await request.query(queryDataTableKlaim);
      let klaim = data_klaim.recordset[0];
      let kode_pajak = data_klaim.recordset[0].kode_pajak;
      let r_distribution_channel_id =
        data_klaim.recordset[0].r_distribution_channel_id;

      let data_klaimdetail = await request.query(queryDataTableKlaimDetail);
      let klaimdetail = data_klaimdetail.recordset;

      klaim.lines = klaimdetail;
      let region_desc = klaimdetail[0].region_id;
      let sqlgetregionid = `SELECT * FROM r_region WHERE kode = '${region_desc}'`;
      let dataregion = await request.query(sqlgetregionid);
      let nama_region = dataregion.recordset[0].nama;
      let r_region_id = dataregion.recordset[0].r_region_id;

      klaim.nama_region = nama_region;

      let queryGetEmail = `SELECT email_verifikasi FROM email_klaim 
      WHERE r_distribution_channel_id='${r_distribution_channel_id}' 
      AND r_region_id='${r_region_id}'  AND isemail_klaim = 'Y'`;

      let getdataemail = await request.query(queryGetEmail);

      let dataemail = [];
      for (let i = 0; i < getdataemail.recordset.length; i++) {
        dataemail.push(getdataemail.recordset[i].email_verifikasi);
      }

      dataemail = _.uniq(dataemail);
      const amount = numeral(nominal_claimable)
        .format("0,0")
        .replace(/,/g, ".");

      let sqlgetpajak = `SELECT mp.m_pajak_id,ro.nama FROM m_pajak mp,r_organisasi ro 
      WHERE mp.kode = '${kode_pajak}'
      AND ro.r_organisasi_id = mp.r_organisasi_id`;
      let datapajak = await request.query(sqlgetpajak);
      let nama_pemohon = datapajak.recordset[0].nama;

      if (dataemail.length > 0) {
        const param = {
          subject: "Verifikasi Klaim Proposal",
          nomor_proposal: nomor_proposal,
          distributor: nama_pemohon,
          tanggal_pengajuan: tanggal_invoice,
          nominal_klaim: `Rp. ${amount}`,
        };

        let sqlgetstatusIntegasi = `SELECT TOP 1 * FROM integration_url ORDER BY created DESC`;
        let datastatusIntegasi = await request.query(sqlgetstatusIntegasi);
        let statusIntegasi =
          datastatusIntegasi.recordset.length > 0
            ? datastatusIntegasi.recordset[0].status
            : "DEV";

        if (statusIntegasi == "DEV") {
          dataemail = [];
          dataemail.push("tiasadeputra@gmail.com");
        }

        const template = await sails.helpers.generateHtmlEmail.with({
          htmltemplate: "klaimproposal",
          templateparam: param,
        });
        SendEmail(dataemail.toString(), param.subject, template);
      }

      return res.success({
        result: row,
        message: "Fetch data successfully",
      });
    } catch (err) {
      return res.error(err);
    }
  },

  //  get direct data distributor
  direcoutlet: async function (req, res) {
    const datas = await DB.poolConnect;

    try {
      // get all data
      let datadistributor = `SELECT * FROM m_direct_outlet mdo`;

      datas.query(datadistributor, (err, result) => {
        if (err) {
          return res.error(err);
        }

        const rows = result.recordset;
        return res.success({
          result: rows,
          message: "Get data successfully",
        });
      });
    } catch (err) {
      return res.error(err);
    }
  },

  exportExcel: async function (req, res) {
    const {
      query: {
        m_user_id,
        searchText,
        periode,
        periode1,
        region_id,
        status,
        m_distributor_id,
      },
    } = req;

    await DB.poolConnect;
    try {
      const request = DB.pool.request();

      let WherePeriode = ``;
      if (periode) {
        // WherePeriode = `AND MONTH(tgl_klaim) = '${bulan}' AND YEAR(tgl_klaim) = '${tahun}'`;
        WherePeriode = `AND CONVERT(VARCHAR(10),tgl_pengajuan,120) BETWEEN '${periode}' AND '${periode1}'`;
      }

      let WhereDtb = ``;
      if (m_distributor_id) {
        WhereDtb = `AND m_distributor_id = '${m_distributor_id}' `;
      }

      let WhereStatus = ``;
      if (status) {
        WhereStatus = `AND kl.kode_status = '${status}'`;
      }

      let WhereRegion = ``;
      if (region_id) {
        WhereRegion = `AND kl.kode_region IN (${region_id})`;
      } else {
        let SQLGetUserRegion = `SELECT * FROM m_role_sales WHERE m_user_id = '${m_user_id}'`;
        let dataregion = await request.query(SQLGetUserRegion);
        let region = dataregion.recordset.map(function (item) {
          return item["kode_region"];
        });

        let valueINRegion = "";
        for (const datas of region) {
          valueINRegion += ",'" + datas + "'";
        }
        valueINRegion = valueINRegion.substring(1);
        WhereRegion =
          region.length > 0 ? `AND kl.kode_region IN (${valueINRegion})` : "";
      }

      let sqlGetRole = `SELECT nama,r_distribution_channel_id FROM m_user_role_v WHERE m_user_id='${m_user_id}'`;
      let datarole = await request.query(sqlGetRole);
      let rolename = datarole.recordset[0].nama;
      let r_distribution_channel_id =
        datarole.recordset[0].r_distribution_channel_id;

      let whereClauseSearch = ``;
      if (searchText) {
        whereClauseSearch = `AND kl.nomor_proposal LIKE '%${searchText}%'
          OR kl.nomor_klaim LIKE '%${searchText}%' OR kl.title LIKE '%${searchText}%'
          OR kl.date_prop LIKE '%${searchText}%'
          OR kl.company LIKE '%${searchText}%'
          OR kl.region LIKE '%${searchText}%'
          OR kl.accounting_document_number LIKE '%${searchText}%'
      `;
      }

      let org = `SELECT DISTINCT r_organisasi_id 
      FROM m_user_organisasi WHERE isactive='Y' AND m_user_id = '${m_user_id}'`;
      let orgs = await request.query(org);
      let organization = orgs.recordset.map(function (item) {
        return item["r_organisasi_id"];
      });

      let valueIN = "";
      let listOrg = "";
      for (const datas of organization) {
        valueIN += ",'" + datas + "'";
      }

      valueIN = valueIN.substring(1);
      if (status == null) {
        listOrg =
          organization.length > 0
            ? `AND kl.r_organisasi_id IN (${valueIN})`
            : "";
      }

      let whereClauseStatusRegion = ``;
      if (rolename == "SALESREGION") {
        whereClauseStatusRegion = `AND kl.kode_status IN ('DR','VER','APS','APR','APN','APF','SKP','PAY','RJF','DVS','DTA','EBP')`;
      } else if (rolename == "ACCOUNTING2") {
        whereClauseStatusRegion = `AND kl.kode_status IN ('DR','VER','APS','APR','APN','VERACC','MPD','APF','SKP','TDF','DAD','PAY','RJF','DVS','DTA','EBP')`;
        listOrg = ``;
      } else if (rolename == "ACCOUNTING") {
        whereClauseStatusRegion = `AND kl.kode_status IN ('DR','VER','APS','APR','APN','VERACC','MPD','APF','SKP','TDF','DAD','PAY','RJF','DVS','DTA','EBP')`;
        listOrg = ``;
      } else if (rolename == "SALESMTREGIONKLAIM" && status == null) {
        whereClauseStatusRegion = `AND kl.kode_status IN ('DR','VER','APS','APR','APN','VERACC','MPD','APF','SKP','TDF','DAD','PAY','RJF','DVS','DTA','EBP')`;
        listOrg = ``;
      }

      let WhereChannel = ``;
      if (r_distribution_channel_id) {
        WhereChannel = `AND kl.r_distribution_channel_id = '${r_distribution_channel_id}'`;
      }

      let queryDataTable = `SELECT kl.klaim_detail_id, kl.nomor_klaim, kl.tgl_pengajuan, 
       CONVERT(VARCHAR(10),kl.tanggal_invoice ,120) AS tanggal_invoice,
       kl.kode_soldto, kl.nama_soldto, kl.nomor_proposal, kl.accounting_document_number, kl.activity_code, kl.activity, 
       kl.brand, kl.branch_code, kl.branch_desc, kl.nama_npwp, kl.nomor_npwp, kl.nomor_faktur, kl.invoice, 
       CONVERT(VARCHAR(10),kl.tgl_bayar ,120) as tgl_bayar, 
       kl.nomor_payment, kl.nomor_resi, kl.penerima, kl.jasa_pengiriman, 
       CONVERT(VARCHAR(10),kl.tanggal_faktur_pajak ,120) as tanggal_faktur_pajak, kl.perihal_klaim, 
       kl.budget_awal, kl.nominal_pengajuan, kl.nominal_disetujui, kl.sisa_budget, kl.status_close_budget, 
       kl.newstatus, kl.pengajuan, kl.verifikasi_adm_mi, kl.verifikasi_acc, kl.mpd, kl.dok_diterima_admin_mi, 
       kl.dok_terverifikasi, kl.approve_rsm, kl.approve_sales_head, kl.dok_diterima_acc, kl.waiting_plan_payment, 
       kl.skp, kl.payment_completed, kl.ebupot_completed, kl.klaim_id, kl.m_distributor_id, kl.kode_status, kl.kode_region, 
       kl.company, kl.region, kl.title, kl.date_prop, kl.r_distribution_channel_id, 
       CONVERT(VARCHAR(10),kl.tgl_submit ,120) AS tgl_submit,
       CONVERT(VARCHAR(10),kl.tgl_reject ,120) AS tgl_reject, 
       kl.reason,
       kl.kode_shipto,kl.nama_shipto,
       kv.nominal_pajak,
       d.nama as nama_acc_penerima_dokumen,
       dc.nama AS channel
       FROM klaim_report kl
       LEFT JOIN klaim_v kv ON kv.klaim_id = kl.klaim_id
       LEFT JOIN audit_klaim c ON c.klaim_id = kl.klaim_id AND c.status = 'Dok Asli diterima ACC MI'
       LEFT JOIN m_user d ON d.m_user_id = c.m_user_id
       LEFT JOIN r_distribution_channel dc ON kl.r_distribution_channel_id = dc.r_distribution_channel_id 
       WHERE 1=1 AND kl.kode_shipto IS NOT NULL ${listOrg} ${whereClauseSearch} ${whereClauseStatusRegion} 
       ${WherePeriode} ${WhereStatus} ${WhereChannel} ${WhereRegion} ${WhereDtb}
       ORDER BY kl.tgl_pengajuan DESC`;

      console.log("CEK Query : ", queryDataTable);

      request.query(queryDataTable, async (err, result) => {
        if (err) {
          return res.error(err);
        }

        const rows = result.recordset;
        let arraydetailsforexcel = [];
        for (let i = 0; i < rows.length; i++) {
          // console.log("Lop >", rows[i].nomor_klaim);
          let obj = {
            "NO DOCUMEN KLAIM": rows[i].nomor_klaim,
            "TANGGAL PENGAJUAN": rows[i].tgl_pengajuan,
            "TANGGAL INVOICE": rows[i].tanggal_invoice,
            REGION: rows[i].region,
            "KODE SOLDTO": rows[i].kode_soldto,
            "NAMA SOLDTO": rows[i].nama_soldto,
            "KODE SHIPTO": rows[i].kode_shipto,
            "NAMA SHIPTO": rows[i].nama_shipto,
            CHANNEL: rows[i].channel,
            "NOMOR PROPOSAL": rows[i].nomor_proposal,
            "DOCUMENT SAP": rows[i].accounting_document_number,
            "ACTIVITY CODE": rows[i].activity_code,
            "DESC ACTIVITY": rows[i].activity,
            BRAND: rows[i].brand,
            "KODE CABANG": rows[i].branch_code,
            CABANG: rows[i].branch_desc,
            "NAMA NPWP": rows[i].nama_npwp,
            "NOMOR NPWP": rows[i].nomor_npwp,
            "NOMOR FAKTUR": rows[i].nomor_faktur,
            INVOICE: rows[i].invoice,
            "TANGGAL TRANSFER": rows[i].tgl_bayar,
            "NOMOR PAYMENT": rows[i].nomor_payment,
            "NOMOR RESI": rows[i].nomor_resi,
            PENERIMA: rows[i].penerima,
            "JASA PENGIRIMAN": rows[i].jasa_pengiriman,
            "TANGGAL FAKTUR": rows[i].tanggal_faktur_pajak,
            PERIHAL: rows[i].perihal_klaim,
            "NOMINAL PENGAJUAN": rows[i].nominal_pengajuan,
            "NOMINAL PAJAK": rows[i].nominal_pajak,
            "NOMINAL DISETUJUI": rows[i].nominal_disetujui,
            "SISA BUDGET": rows[i].sisa_budget,
            "STATUS BUDGET": rows[i].status_close_budget,
            "STATUS KLAIM": rows[i].newstatus,
            PENGAJUAN: rows[i].pengajuan,
            "Terverifikasi Adm MI Waiting Acct MI": rows[i].verifikasi_adm_mi,
            "Terverifikasi Acct MI Waiting Pengiriman Dok Klaim":
              rows[i].verifikasi_acc,
            "Menunggu Pengiriman Dok Klaim DTB": rows[i].mpd,
            "Dok Diterima Adm MI Waiting Verifikasi":
              rows[i].dok_diterima_admin_mi,
            "Dok Terverifikasi Waiting Approval RSM": rows[i].dok_terverifikasi,
            "Waiting Approval Sales Head": rows[i].approve_rsm,
            "Approval Sales Head": rows[i].approve_sales_head,
            "Dok Asli diterima ACC MI": rows[i].dok_diterima_acc,
            "Waiting Plan Payment": rows[i].waiting_plan_payment,
            "Submit Klaim to SAP": rows[i].skp,
            "Payment Completed": rows[i].payment_completed,
            "ALASAN REJECT": rows[i].reason,
            "TANGGAL REJECT": rows[i].tgl_reject,
            "Nama Acc Penerima Dokumen": rows[i].nama_acc_penerima_dokumen,
          };

          arraydetailsforexcel.push(obj);
        }
        // console.log(arraydetailsforexcel);

        if (arraydetailsforexcel.length > 0) {
          let tglfile = moment().format("DD-MMM-YYYY_HH_MM_SS");
          let namafile = "klaim_".concat(tglfile).concat(".xlsx");

          var hasilXls = json2xls(arraydetailsforexcel);
          res.setHeader("Content-Type", "application/vnd.openxmlformats");
          res.setHeader(
            "Content-Disposition",
            "attachment; filename=" + namafile
          );
          res.end(hasilXls, "binary");
        } else {
          let obj = {
            "NO DOCUMEN KLAIM": "",
            "TANGGAL PENGAJUAN": "",
            "TANGGAL INVOICE": "",
            REGION: "",
            "KODE SOLDTO": "",
            "NAMA SOLDTO": "",
            "KODE SHIPTO": "",
            "NAMA SHIPTO": "",
            CHANNEL: "",
            "NOMOR PROPOSAL": "",
            "DOCUMENT SAP": "",
            "ACTIVITY CODE": "",
            "DESC ACTIVITY": "",
            BRAND: "",
            "KODE CABANG": "",
            CABANG: "",
            "NAMA NPWP": "",
            "NOMOR NPWP": "",
            "NOMOR FAKTUR": "",
            INVOICE: "",
            "TANGGAL TRANSFER": "",
            "NOMOR PAYMENT": "",
            "NOMOR RESI": "",
            PENERIMA: "",
            "JASA PENGIRIMAN": "",
            "TANGGAL FAKTUR": "",
            PERIHAL: "",
            "NOMINAL PENGAJUAN": "",
            "NOMINAL PAJAK": "",
            "NOMINAL DISETUJUI": "",
            "SISA BUDGET": "",
            "STATUS BUDGET": "",
            "STATUS KLAIM": "",
            PENGAJUAN: "",
            "Terverifikasi Adm MI Waiting Acct MI": "",
            "Terverifikasi Acct MI Waiting Pengiriman Dok Klaim": "",
            "Menunggu Pengiriman Dok Klaim DTB": "",
            "Dok Diterima Adm MI Waiting Verifikasi": "",
            "Dok Terverifikasi Waiting Approval RSM": "",
            "Waiting Approval Sales Head": "",
            "Approval Sales Head": "",
            "Dok Asli diterima ACC MI": "",
            "Waiting Plan Payment": "",
            "Submit Klaim to SAP": "",
            "Payment Completed": "",
            "SUBMIT SAP": "",
            "ALASAN REJECT": "",
            "TANGGAL REJECT": "",
            "Nama Acc Penerima Dokumen": "",
          };

          arraydetailsforexcel.push(obj);

          let tglfile = moment().format("DD-MMM-YYYY_HH_MM_SS");
          let namafile = "klaim_".concat(tglfile).concat(".xlsx");

          var hasilXls = json2xls(arraydetailsforexcel);
          res.setHeader("Content-Type", "application/vnd.openxmlformats");
          res.setHeader(
            "Content-Disposition",
            "attachment; filename=" + namafile
          );
          res.end(hasilXls, "binary");
        }
      });
    } catch (err) {
      return res.error(err);
    }
  },
  getApprovalKlaim: async function (req, res) {
    await DB.poolConnect;
    try {
      const request = DB.pool.request();

      let SqlGetDataUser = `SELECT * FROM m_user WHERE nik = '${req.param(
        "id"
      )}'`;
      let getDataUser = await request.query(SqlGetDataUser);
      let dataUser = getDataUser.recordset;
      let m_user_id = dataUser.length > 0 ? dataUser[0].m_user_id : null;

      if (m_user_id) {
        let queryDataTable = `SELECT DISTINCT nama FROM m_user_role_v_new WHERE m_user_id = '${m_user_id}'`;
        // console.log(queryDataTable);
        let GetDataRoles = await request.query(queryDataTable);
        let roleAcess = GetDataRoles.recordset;

        let totalApproval = 0;
        if (checkRole(roleAcess, ["SALESGTREGIONKLAIM"])) {
          let sqlGetApproval = `SELECT COUNT(1) AS jumlah FROM klaim_v WHERE kode_status IN('DR','MPD','DTA')`;
          let GetDataApproval = await request.query(sqlGetApproval);
          let dataApproval = GetDataApproval.recordset[0].jumlah;

          totalApproval = totalApproval + dataApproval;
        }

        return res.success({
          result: totalApproval,
          message: "Fetch data successfully",
        });
      } else {
        return res.success({
          result: 0,
          message: "Fetch data successfully",
        });
      }
    } catch (err) {
      return res.error(err);
    }
  },

  findAudit: async function (req, res) {
    await DB.poolConnect;
    try {
      const request = DB.pool.request();

      let queryDataTable = `SELECT status,mu.nama,CONVERT(VARCHAR(16),ak.created ,120) AS tgl_action,
            COALESCE((
              SELECT TOP 1 CONVERT(VARCHAR(19),created,120) FROM audit_klaim WHERE klaim_id = ak.klaim_id AND created < ak.created ORDER BY created DESC
            ),CONVERT(VARCHAR(19),ak.created,120)) AS startdate,
          CONVERT(VARCHAR(19),ak.created,120) AS enddate
          FROM audit_klaim ak
          LEFT JOIN m_user mu ON ak.m_user_id = mu.m_user_id 
          WHERE ak.klaim_id = '${req.param(
            "id"
          )}' AND ak.isactive='Y' ORDER BY ak.created`;

          console.log(queryDataTable);

      // console.log(queryDataTable);
      request.query(queryDataTable, async (err, result) => {
        if (err) {
          return res.error(err);
        }

        const rows = result.recordset;

        for (let i = 0; i < rows.length; i++) {
          let startdate = rows[i].startdate ? rows[i].startdate : null;
          let enddate = rows[i].enddate ? rows[i].enddate : null;

          // console.log('startdate ',startdate);
          // console.log('enddate', enddate);

          let difference = calcBusinessDays(startdate, enddate);
          console.log(difference,"============================================");
          let leadtime = `-`;
          if (startdate) {
            let data = momentBusinessDays(startdate, "YYYY-MM-DD").businessAdd(
              3
            )._d;
            leadtime = moment(data).format("YYYY-MM-DD");
          }

          let timeAllert = false;
          if (moment() > moment(leadtime, "YYYY-MM-DD")) {
            timeAllert = true;
          }

          let hasil = GetTimeDiff(difference);
          console.log(hasil,"============================================");
          rows[i].serviceLevel = hasil;
          rows[i].timeAllert = timeAllert;
        }

        return res.success({
          result: rows,
          message: "Fetch data successfully",
        });
      });
    } catch (err) {
      return res.error(err);
    }
  },
};

async function updatenotifikasi_reject(klaim_id, m_user_id, status, rolename) {
  await DB.poolConnect;
  const request = DB.pool.request();
  let upd = `UPDATE notifikasi_klaim set is_proses = 1, updateddate = getdate() WHERE klaim_id = '${klaim_id}'
  AND is_proses = 0 `;

  let ins = `INSERT INTO audit_klaim (klaim_id,m_user_id,rolename,status)
  VALUES ('${klaim_id}','${m_user_id}','${rolename}','${status}')`;

  // console.log(upd,ins);
  await request.query(ins);
  await request.query(upd);
}
async function updatenotifikasi(klaim_id, region_id, channel) {
  await DB.poolConnect;
  try {
    const request = DB.pool.request();
    let sel = `SELECT * FROM notifikasi_klaim WHERE klaim_id = '${klaim_id}' AND is_proses = 0`;
    let resp = await request.query(sel);
    resp = resp.recordset;

    console.log(sel);
    let kode_tobe = ``;
    let status_tobe = ``;
    if (resp.length > 0) {
      let kode_notif = resp[0].kode_status;
      let notifikasi_klaim_id = resp[0].notifikasi_klaim_id;

      if (kode_notif == "DR") {
        let upd = `UPDATE notifikasi_klaim set is_proses = 1, updateddate = getdate() WHERE klaim_id = '${klaim_id}'
                   AND is_proses = 0 `;
        await request.query(upd);

        kode_tobe = `VER`;
        status_tobe = `Klaim Need to be Verify`;

        console.log(upd);
        var seluser = `SELECT * FROM m_user mu WHERE username = 'acc2'`;
        let resp_user = await request.query(seluser);
        resp_user = resp_user.recordset;
        for (let i = 0; i < resp_user.length; i++) {
          let ins = `INSERT INTO notifikasi_klaim (klaim_id,r_distribution_channel_id,kode_region,kode_status,status,is_proses,createddate,updateddate,m_user_id)
            VALUES ('${klaim_id}','${channel}','${region_id}','${kode_tobe}','${status_tobe}',0,getdate(),null,'${resp_user[i].m_user_id}')`;

          await request.query(ins);
          console.log(ins);
        }
      } else if (kode_notif == "VER") {
        let upd = `UPDATE notifikasi_klaim set is_proses = 1, updateddate = getdate() WHERE klaim_id = '${klaim_id}'
                   AND is_proses = 0 `;
        await request.query(upd);

        kode_tobe = `VERACC`;
        status_tobe = `Menunggu Pengiriman Dok. Klaim DTB`;
        // kirim email ke distributor
      } else if (kode_notif == "MPD") {
        let upd = `UPDATE notifikasi_klaim set is_proses = 1, updateddate = getdate() WHERE klaim_id = '${klaim_id}'
                   AND is_proses = 0 `;
        await request.query(upd);

        kode_tobe = `DTA`;
        status_tobe = `Waiting Verifikasi DOK Klaim`;

        console.log(upd);
        var seluser = `SELECT * FROM m_role_sales mrs WHERE kode_region = '${region_id}'`;
        let resp_user = await request.query(seluser);
        resp_user = resp_user.recordset;
        for (let i = 0; i < resp_user.length; i++) {
          let ins = `INSERT INTO notifikasi_klaim (klaim_id,r_distribution_channel_id,kode_region,kode_status,status,is_proses,createddate,updateddate,m_user_id)
            VALUES ('${klaim_id}','${channel}','${region_id}','${kode_tobe}','${status_tobe}',0,getdate(),null,'${resp_user[i].m_user_id}')`;

          await request.query(ins);
          console.log(ins);
        }
      } else if (kode_notif == "DTA") {
        let upd = `UPDATE notifikasi_klaim set is_proses = 1, updateddate = getdate() WHERE klaim_id = '${klaim_id}'
                   AND is_proses = 0 `;
        await request.query(upd);
      }
    } else {
      let cekstat = `SELECT * FROM klaim WHERE klaim_id = '${klaim_id}'`;
      console.log(cekstat);

      let res_stat = await request.query(cekstat);
      res_stat = res_stat.recordset[0];

      if (res_stat.kode_status == "MPD") {
        console.log(`menunggu..`);
        var seluser = `SELECT * FROM m_role_sales mrs WHERE kode_region = '${region_id}'`;
        let resp_user = await request.query(seluser);
        resp_user = resp_user.recordset;
        for (let i = 0; i < resp_user.length; i++) {
          let ins = `INSERT INTO notifikasi_klaim (klaim_id,r_distribution_channel_id,kode_region,kode_status,status,is_proses,createddate,updateddate,m_user_id)
              VALUES ('${klaim_id}','${channel}','${region_id}','MPD','Menunggu Penerimaan DOK Klaim',0,getdate(),null,'${resp_user[i].m_user_id}')`;

          await request.query(ins);
          console.log(ins);
        }
      }
    }
    console.log(sel, resp.length);
  } catch (err) {
    console.log(err);
  }
}

function racikXMLHeader(xmlTemplate, jsonArray, rootHead) {
  var builder = new xml2js.Builder({ headless: true, rootName: rootHead });

  const result = builder.buildObject(jsonArray);

  return xmlTemplate.replace("header", result);
}
function racikXMLHeader2(xmlTemplate, jsonArray, rootHead) {
  var builder = new xml2js.Builder({ headless: true, rootName: rootHead });

  const result = builder.buildObject(jsonArray);

  return xmlTemplate.replace("#", result);
}
function racikXMLDetail2(xmlTemplate, jsonArray, rootHead) {
  var builder = new xml2js.Builder({ headless: true, rootName: rootHead });
  const addTemplate = jsonArray.map((data) => {
    return { item: data };
  });
  const result = builder.buildObject(addTemplate);

  return xmlTemplate.replace("*", result);
}
function racikXMLDetail(xmlTemplate, jsonArray, rootHead) {
  var builder = new xml2js.Builder({ headless: true, rootName: rootHead });
  const addTemplate = jsonArray.map((data) => {
    return { item: data };
  });
  const result = builder.buildObject(addTemplate);

  return xmlTemplate.replace("detail", result);
}
function pad(d) {
  var str = "" + d;
  var pad = "00000";
  var ans = pad.substring(0, pad.length - str.length) + str;
  return ans;
}

function padnumber(d) {
  return d < 10 ? "0" + d.toString() : d.toString();
}

function GetTimeDiff(seconds) {
  let how_log_ago = "";
  let minutes = Math.round(seconds / 60);
  let hours = Math.round(minutes / 60);
  let days = Math.round(hours / 24);

  if (days >= 1) {
    how_log_ago = days + " day" + (days != 1 ? "s" : "");
  } else if (hours >= 1) {
    how_log_ago = hours + " hour" + (hours != 1 ? "s" : "");
  } else if (minutes >= 1) {
    how_log_ago = minutes + " minute" + (minutes != 1 ? "s" : "");
  } else {
    how_log_ago = seconds + " second" + (seconds != 1 ? "s" : "");
  }

  how_log_ago = seconds == 0 ? "-" : how_log_ago;

  return how_log_ago;
}

function checkRole(userRoles, roles) {
  const isTrue = userRoles.some((e) => roles.includes(e.nama));
  return isTrue;
}

function calcBusinessDays(dm1, dm2) {
  const d1 = moment(dm1, "YYYY-MM-DD HH:mm:ss");
  const d2 = moment(dm2, "YYYY-MM-DD HH:mm:ss");
  const secondsDiff = d2.diff(d1, "seconds");

  // Dapatkan interval murni dari 2 tanggal tanpa di potong weekend
  const momentFulldaysd1 = moment(dm1, "YYYY-MM-DD");
  const momentFulldaysd2 = moment(dm2, "YYYY-MM-DD");
  const days = momentFulldaysd2.diff(momentFulldaysd1, "days");
  console.log("Debug Total Days:", days);

  var sundays = 0;
  var saturdays = 0;
  let newDay = d1.toDate();
  //dapatkan ada berapa weekend yg terdapat dari 2 tanggal
  for (let i = 0; i < days; i++) {
    const day = newDay.getDay();
    newDay = d1.add(1, "days").toDate();
    const isWeekend = day % 6 === 0;
    if (!isWeekend) {
      //abaikan hari kerja
    } else {
      if (day === 6) saturdays++;
      if (day === 0) sundays++;
    }
  }

  // console.log('cetak ada berapa sabtu dan minggu untuk debug: ', "saturdays", saturdays, "sundays", sundays);

  //interval seluruh hari di kurang interval weekend
  const weekendSeconds = (Number(saturdays) + Number(sundays)) * 86400;
  const weekedaySecondSubstractWeekendSeconds = secondsDiff - weekendSeconds;

  return weekedaySecondSubstractWeekendSeconds;
}
