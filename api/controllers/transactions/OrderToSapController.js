/* eslint-disable no-console */
/* eslint-disable no-undef */
/**
 * SampeCrudController
 *
 * @description :: Server-side actions for handling incoming requests.
 * @help        :: See https://sailsjs.com/docs/concepts/actions
 */
const Base64 = require("base-64");
const soapRequest = require("easy-soap-request");
const fs = require("fs");
const xml2js = require("xml2js");
const uuid = require("uuid/v4");
const SendEmail = require("../../services/SendEmail");
const moment = require("moment");
const axios = require("axios");
const path = require("path");
const dokumentPath = (param2, param3) =>
  path.resolve(sails.config.appPath, "repo", param2, param3);
const ClientSFTP = require("ssh2-sftp-client");
var shell = require("shelljs");
const { Console } = require("console");
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
      query: { isnosap },
    } = req;

    await DB.poolConnect;
    try {
      const request = DB.pool.request();
      let nosap = "";

      if (isnosap === "N") {
        nosap = `co.nomor_sap is null`;
      } else {
        nosap = `co.nomor_sap is not null`;
      }

      let queryDataTable = `SELECT cmo.nomor_cmo,
                            mp.item_kategori,
                            rdc.kode as distribution_channel,
                            rop.kode as sold_to_party,
                            ro.kode as ship_to_party,
                            convert(varchar,DATEADD(m, DATEDIFF(m, 0,co.schedule_date), 0), 112) as validfrom,
                            convert(varchar,DATEADD(s,-1,DATEADD(mm, DATEDIFF(m,0,co.schedule_date)+1,0)), 112) as validto,
                            mp.kode_sap as sku_number,
                            mp.kode as sku_customer,
                            cod.qty,
                            mp.satuan,
                            convert(varchar, co.schedule_date, 112) as delivery_date,
                            cod.stok_awal as stok_awal_cycle,
                            cod.doi as doi_distributor,
                            cod.estimasi_sales_bulan_depan,
                            cod.estimasi_sales_duabulan_kedepan,
                            ro.nama
                            FROM c_order co
                            LEFT JOIN cmo cmo ON(cmo.cmo_id = co.cmo_id)
                            LEFT JOIN c_orderdetail cod ON(cod.c_order_id = co.c_order_id)
                            LEFT JOIN m_produk mp ON(mp.m_produk_id = cod.m_produk_id)
                            LEFT JOIN m_distributor md ON(md.m_distributor_id = cmo.m_distributor_id)
                            LEFT JOIN r_distribution_channel rdc ON(rdc.r_distribution_channel_id = md.r_distribution_channel_id)
                            LEFT JOIN r_organisasi ro ON(ro.r_organisasi_id = md.r_organisasi_id)
                            LEFT JOIN m_pajak mpj ON(mpj.m_pajak_id = md.m_pajak_id)
                            LEFT JOIN r_organisasi rop ON(rop.r_organisasi_id = mpj.r_organisasi_id) WHERE ${nosap}`;

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
          message: "Fetch data successfully",
        });
      });
    } catch (err) {
      return res.error(err);
    }
  },

  // GET ONE RESOURCE
  findOne: async function (req, res) {
    await DB.poolConnect;
    try {
      const request = DB.pool.request();

      let queryDataTable = `SELECT cmo.nomor_cmo,
      mp.item_kategori,
      rdc.kode as distribution_channel,
      rop.kode as sold_to_party,
      ro.kode as ship_to_party,
      convert(varchar,DATEADD(m, DATEDIFF(m, 0,co.schedule_date), 0), 112) as validfrom,
      convert(varchar,DATEADD(s,-1,DATEADD(mm, DATEDIFF(m,0,co.schedule_date)+1,0)), 112) as validto,
      mp.kode_sap as sku_number,
      mp.kode as sku_customer,
      cod.qty,
      mp.satuan,
      convert(varchar, co.schedule_date, 112) as delivery_date,
      cod.stok_awal as stok_awal_cycle,
      cod.doi as doi_distributor,
      cod.estimasi_sales_bulan_depan,
      cod.estimasi_sales_duabulan_kedepan,
      ro.nama
      FROM c_order co
      LEFT JOIN cmo cmo ON(cmo.cmo_id = co.cmo_id)
      LEFT JOIN c_orderdetail cod ON(cod.c_order_id = co.c_order_id)
      LEFT JOIN m_produk mp ON(mp.m_produk_id = cod.m_produk_id)
      LEFT JOIN m_distributor md ON(md.m_distributor_id = cmo.m_distributor_id)
      LEFT JOIN r_distribution_channel rdc ON(rdc.r_distribution_channel_id = md.r_distribution_channel_id)
      LEFT JOIN r_organisasi ro ON(ro.r_organisasi_id = md.r_organisasi_id)
      LEFT JOIN m_pajak mpj ON(mpj.m_pajak_id = md.m_pajak_id)
      LEFT JOIN r_organisasi rop ON(rop.r_organisasi_id = mpj.r_organisasi_id)
      WHERE co.c_order_id='${req.param("id")}'`;

      request.query(queryDataTable, (err, result) => {
        if (err) {
          return res.error(err);
        }

        const row = result.recordset[0];
        return res.success({
          result: row,
          message: "Fetch data successfully",
        });
      });
    } catch (err) {
      return res.error(err);
    }
  },
  cmopostToSap: async function (req, res) {
    await DB.poolConnect;
    const { cmo_id, m_user_id } = req.body;
    try {
      const request = DB.pool.request();

      let dataorg = await request.query(`SELECT nama 
      FROM m_user_role_v 
      WHERE m_user_id = '${m_user_id}'`);

      let getcmo = await request.query(`SELECT mdv.r_organisasi_id,
      c.flow + 1 AS flow,mdv.m_distributor_id
      FROM cmo c,m_distributor_v mdv WHERE c.cmo_id = '${cmo_id}' 
      AND mdv.m_distributor_id = c.m_distributor_id`);

      let r_organisasi_id = getcmo.recordset[0].r_organisasi_id;
      let m_distributor_id = getcmo.recordset[0].m_distributor_id;
      let flow = getcmo.recordset[0].flow;

      let emailcase = await request.query(`SELECT email_verifikasi FROM m_distributor_profile_v 
      WHERE r_organisasi_id='${r_organisasi_id}' AND rolename IN('RSDH','ASDH')`);

      let emailcase2 = await request.query(`SELECT email_verifikasi FROM email_distributor 
      WHERE m_distributor_id = '${m_distributor_id}' AND tipe='CMO'`);

      let getdataemail = await request.query(`
      SELECT DISTINCT mu.email_verifikasi
      FROM m_user mu,m_role mr 
      left join m_flow_approve mfa ON(mfa.nama = mr.nama)
      WHERE mu.r_organisasi_id = '${r_organisasi_id}'
      AND mu.role_default_id = mr.m_role_id
      AND mfa.line = ${flow}
      AND mu.email_verifikasi IS NOT NULL
      AND mu.isactive = 'Y'`);

      let dataemail = [];
      if (getdataemail.recordset.length > 0) {
        for (let i = 0; i < getdataemail.recordset.length; i++) {
          dataemail.push(getdataemail.recordset[i].email_verifikasi);
        }
      }

      if (emailcase.recordset.length > 0) {
        for (let i = 0; i < emailcase.recordset.length; i++) {
          dataemail.push(emailcase.recordset[i].email_verifikasi);
        }
      }

      if (emailcase2.recordset.length > 0) {
        for (let i = 0; i < emailcase2.recordset.length; i++) {
          dataemail.push(emailcase2.recordset[i].email_verifikasi);
        }
      }

      dataemail = _.uniq(dataemail);

      let sqlCheckKodeStatusCmo = `SELECT * FROM cmo WHERE cmo_id = '${cmo_id}'`;
      let getDataCmo = await request.query(sqlCheckKodeStatusCmo);
      let dataCmo = getDataCmo.recordset.length > 0 ? getDataCmo.recordset[0] : null;
      let kode_status = dataCmo.flow;
      if(dataCmo){

        if (kode_status == 4) {
          //const url = 'http://192.168.100.24:8010/sap/bc/srt/rfc/sap/zws_cmo_upload/120/zws_cmo_upload/zbn_cmo_upload'; // development
  
          let sqlgetstatusIntegasi = `SELECT TOP 1 * FROM integration_url ORDER BY created DESC`;
          let datastatusIntegasi = await request.query(sqlgetstatusIntegasi);
          let statusIntegasi =
            datastatusIntegasi.recordset.length > 0
              ? datastatusIntegasi.recordset[0].status
              : "DEV";
  
          let url = ``;
          if (statusIntegasi == "DEV") {
            url =
              "http://sapdevene.enesis.com:8010/sap/bc/srt/rfc/sap/zws_cmo_upload/120/zws_cmo_upload/zbn_cmo_upload"; // development
          } else {
            url =
              "http://sapprdene.enesis.com:8310/sap/bc/srt/rfc/sap/zws_cmo_upload/300/zws_cmo_upload/zbn_cmo_upload"; // production
          }
  
          let usernamesoap = sails.config.globals.usernamesoap;
          let passwordsoap = sails.config.globals.passwordsoap;
          const tok = `${usernamesoap}:${passwordsoap}`;
          const hash = Base64.encode(tok);
          const Basic = "Basic " + hash;
  
          let queryDataTable = `select x.*,kode_aktif from
              (
              SELECT 
              cmo.nomor_cmo,
              cmo.nomor_po,
              cmo.bulan,
              cmo.tahun,
              mp.item_kategori,
              '00' as spart,
              mpj.kode_channel as distribution_channel,
              rop.kode as sold_to_party,
              ro.kode as ship_to_party,
              convert(varchar,DATEADD(m, DATEDIFF(m, 0,co.schedule_date), 0), 112) as validfrom,
              convert(varchar,DATEADD(s,-1,DATEADD(mm, DATEDIFF(m,0,co.schedule_date)+1,0)), 112) as validto,
              mp.kode_sap as sku_number,
              mp.kode as sku_customer,
              cod.qty,
              mp.satuan,
              convert(varchar, co.schedule_date, 112) as delivery_date,
              cod.stok_awal as stok_awal_cycle,
              cod.doi as doi_distributor,
              cod.estimasi_sales_bulan_depan,
              cod.estimasi_sales_duabulan_kedepan,
              ro.nama,
              co.week_number
              FROM c_order co
              LEFT JOIN cmo cmo ON(cmo.cmo_id = co.cmo_id)
              LEFT JOIN c_orderdetail cod ON(cod.c_order_id = co.c_order_id)
              LEFT JOIN m_produk mp ON(mp.m_produk_id = cod.m_produk_id)
              LEFT JOIN m_distributor md ON(md.m_distributor_id = cmo.m_distributor_id)
              LEFT JOIN r_distribution_channel rdc ON(rdc.r_distribution_channel_id = md.r_distribution_channel_id)
              LEFT JOIN r_organisasi ro ON(ro.r_organisasi_id = md.r_organisasi_id)
              LEFT JOIN m_pajak mpj ON(mpj.m_pajak_id = md.m_pajak_id)
              LEFT JOIN r_organisasi rop ON(rop.r_organisasi_id = mpj.r_organisasi_id)
              WHERE co.cmo_id='${cmo_id}' and cod.qty > 0 and cmo.no_sap is null
              )x left join 
              m_produk_replacement y on x.sku_number = y.kode_non_aktif`;
  
          // and mp.kode_sap not in ('1000444','1000445','1000443','1000442','1000441','1000440')
  
          console.log(queryDataTable);
  
          let datacmo = await request.query(queryDataTable);
          let rows = datacmo.recordset;
  
          let usernama = datacmo.recordset[0].nama;
          let nomor_cmo = datacmo.recordset[0].nomor_cmo;
          let bulan = datacmo.recordset[0].bulan;
          let tahun = datacmo.recordset[0].tahun;
  
          let cmoattribute = usernama
            .concat("-")
            .concat(nomor_cmo)
            .concat("-")
            .concat(bulan)
            .concat("-")
            .concat(tahun);
          let datas = [];
          for (let i = 0; i < rows.length; i++) {
            datas.push({
              MANDT: "",
              BSTKD: rows[i].nomor_cmo,
              BNAME: rows[i].nomor_po,
              AUART: rows[i].item_kategori,
              VTWEG: rows[i].distribution_channel,
              SPART: rows[i].spart,
              KUNNR: rows[i].sold_to_party,
              KUNSH: rows[i].ship_to_party,
              GUEBG: rows[i].validfrom,
              GUEEN: rows[i].validto,
              MATNR: rows[i].sku_number,
              SKU: rows[i].sku_customer,
              WMENG: rows[i].qty,
              VRKME: rows[i].satuan,
              EDATU: rows[i].delivery_date,
              STOKA: rows[i].stok_awal_cycle,
              DOI: rows[i].doi_distributor,
              M1: "",
              M2: "",
              VBELN: "",
              SMATN: rows[i].kode_aktif,
              WEEK1: rows[i].week_number,
            });
          }
  
          let responsesap = undefined;
          if (datas.length > 0) {
            let sampleHeaders = {
              Authorization: Basic,
              "user-agent": "sampleTest",
              "Content-Type": "text/xml;charset=UTF-8",
              soapAction:
                "urn:sap-com:document:sap:rfc:functions/ZWS_CMO_UPLOAD/ZFM_WS_CMORequest",
            };
  
            let xml = fs.readFileSync("soap/ZFM_WS_CMO.xml", "utf-8"); // saya duplicate file 'ZFM_WS_CMO.xml' ya, dan pake yg baru saya buat itu sebagai template
            let hasil = racikXML(xml, datas, "ITAB");
            console.log(hasil);
  
            let { response } = await soapRequest({
              url: url,
              headers: sampleHeaders,
              xml: hasil,
              timeout: 1000000,
            }); // Optional timeout parameter(milliseconds)
            let { body, statusCode } = response;
            console.log(body);
            console.log(statusCode);
  
            let hasilTransfrom = undefined;
            xml2js.parseString(body, function (err, result) {
              let temp = result["soap-env:Envelope"]["soap-env:Body"];
              let json = JSON.stringify(temp[0]);
              let json2 = JSON.parse(json);
              let json3 = json2["n0:ZFM_WS_CMOResponse"][0].RESULT[0];
  
              let VBELN = json3.item[0].VBELN[0];
              let CMONO = json3.item[0].CMONO[0];
  
              hasilTransfrom = {
                VBELN: VBELN,
                CMONO: CMONO,
              };
            });
  
            let data = {
              status: statusCode,
              value: hasilTransfrom,
            };
            responsesap = data;
  
            await request.query(`UPDATE cmo SET status = 'Approved',
                      no_sap = '${data.value.VBELN}',
                      flow = 4
                      WHERE cmo_id = '${cmo_id}'`);
  
            let audit_cmo_id = uuid();
            await request.query(`INSERT INTO audit_cmo
            (audit_cmo_id,createdby,updatedby, cmo_id, m_user_id, actions, status)
            VALUES('${audit_cmo_id}','${m_user_id}',
            '${m_user_id}','${cmo_id}', '${m_user_id}',
            'Approved',
            'Approved')`);

  
            let SqlgetdataEmail = `SELECT DISTINCT mu.email_verifikasi
            FROM m_user_organisasi muo,m_user mu,m_role mr 
            left join m_flow_approve mfa ON(mfa.nama = mr.nama)
            WHERE muo.r_organisasi_id = '${r_organisasi_id}'
            AND muo.m_user_id = mu.m_user_id
            AND mu.role_default_id = mr.m_role_id
            AND mu.email_verifikasi IS NOT NULL
            AND muo.isactive = 'Y'`;
  
            let getdataemail = await request.query(SqlgetdataEmail);
  
            let dataemail = [];
            for (let i = 0; i < getdataemail.recordset.length; i++) {
              dataemail.push(getdataemail.recordset[i].email_verifikasi);
            }
  
            if (emailcase2.recordset.length > 0) {
              for (let i = 0; i < emailcase2.recordset.length; i++) {
                dataemail.push(emailcase2.recordset[i].email_verifikasi);
              }
            }
  
            if (dataemail.length > 0) {
              SendEmail(
                dataemail.toString(),
                cmoattribute,
                `<b>CMO Approved</b>`,
                async (err, info) => {
                  if (err) {
                    console.log("error", err);
  
                    await request.query(`INSERT INTO log_email
                              (createdby, updatedby,proses,accepted,rejected,envelope, response)
                              VALUES('${m_user_id}','${m_user_id}', 'Error Email','${err}',
                              '${err}','${err}','${err}')`);
                  } else {
                    console.log("info", info);
                    let from = info.envelope.from;
                    let to = info.envelope.to.toString();
                    let envelope = from.concat(" send to ").concat(to);
                    await request.query(`INSERT INTO log_email
                              (createdby, updatedby,proses,accepted,rejected,envelope, response)
                              VALUES('${m_user_id}','${m_user_id}', 'Approve CMO','${info.accepted.toString()}',
                              '${info.rejected.toString()}','${envelope}','${
                      info.response
                    }')`);
                  }
                }
              );
            }
  
            return res.success({
              result: rows,
              message: responsesap,
            });
          } else {
            return res.success({
              result: rows,
              message: "No SAP sudah ada",
            });
          }
        } else {
          
          let queryDataTable = `SELECT 
          cmo.nomor_cmo,
          cmo.bulan,
          cmo.tahun,
          mp.item_kategori,
          '00' as spart,
          mpj.kode_channel as distribution_channel,
          rop.kode as sold_to_party,
          ro.kode as ship_to_party,
          convert(varchar,DATEADD(m, DATEDIFF(m, 0,co.schedule_date), 0), 112) as validfrom,
          convert(varchar,DATEADD(s,-1,DATEADD(mm, DATEDIFF(m,0,co.schedule_date)+1,0)), 112) as validto,
          mp.kode_sap as sku_number,
          mp.kode as sku_customer,
          cod.qty,
          mp.satuan,
          convert(varchar, co.schedule_date, 112) as delivery_date,
          cod.stok_awal as stok_awal_cycle,
          cod.doi as doi_distributor,
          cod.estimasi_sales_bulan_depan,
          cod.estimasi_sales_duabulan_kedepan,
          ro.nama
          FROM c_order co
          LEFT JOIN cmo cmo ON(cmo.cmo_id = co.cmo_id)
          LEFT JOIN c_orderdetail cod ON(cod.c_order_id = co.c_order_id)
          LEFT JOIN m_produk mp ON(mp.m_produk_id = cod.m_produk_id)
          LEFT JOIN m_distributor md ON(md.m_distributor_id = cmo.m_distributor_id)
          LEFT JOIN r_distribution_channel rdc ON(rdc.r_distribution_channel_id = md.r_distribution_channel_id)
          LEFT JOIN r_organisasi ro ON(ro.r_organisasi_id = md.r_organisasi_id)
          LEFT JOIN m_pajak mpj ON(mpj.m_pajak_id = md.m_pajak_id)
          LEFT JOIN r_organisasi rop ON(rop.r_organisasi_id = mpj.r_organisasi_id)
          WHERE co.cmo_id='${cmo_id}' and cmo.no_sap is null
          AND co.isactive = 'Y'`;
  
          let datacmo = await request.query(queryDataTable);
          let rows = datacmo.recordset;
  
          let datauser = await request.query(`SELECT mu.r_organisasi_id,
          COALESCE(mu.nama,'nama user') AS nama 
          FROM m_user mu 
          WHERE mu.m_user_id = '${m_user_id}'`);
          let usernama = datauser.recordset[0].nama;
          let status = `Approve Succesfully `;
          let nomor_cmo = rows[0].nomor_cmo;
          let bulan = moment(rows[0].bulan, "MM").format("MM");
          let tahun = moment(rows[0].tahun, "YYYY").format("YYYY");
          let cmoattribute = usernama
            .concat("-")
            .concat(nomor_cmo)
            .concat("-")
            .concat(bulan)
            .concat("-")
            .concat(tahun);
  
          if (dataemail.length > 0) {
            SendEmail(
              dataemail.toString(),
              cmoattribute,
              `<b>CMO Approved</b>`,
              async (err, info) => {
                if (err) {
                  await request.query(`INSERT INTO log_email
                          (createdby, updatedby,proses,accepted,rejected,envelope, response)
                          VALUES('${m_user_id}','${m_user_id}', 'Error Email','${err}',
                          '${err}','${err}','${err}')`);
                } else {
                  console.log("info", info);
                  let from = info.envelope.from;
                  let to = info.envelope.to.toString();
                  let envelope = from.concat(" send to ").concat(to);
                  await request.query(`INSERT INTO log_email
                          (createdby, updatedby,proses,accepted,rejected,envelope, response)
                          VALUES('${m_user_id}','${m_user_id}', 'Approve CMO','${info.accepted.toString()}',
                          '${info.rejected.toString()}','${envelope}','${
                    info.response
                  }')`);
                }
              }
            );
          }
  
          let audit_cmo_id = uuid();
   
          if(kode_status==2){

            let sqlAudit = `INSERT INTO audit_cmo
            (audit_cmo_id,createdby,updatedby, cmo_id, m_user_id, actions, status)
            VALUES('${audit_cmo_id}','${m_user_id}',
            '${m_user_id}','${cmo_id}', '${m_user_id}',
            'Approve',
            'Waiting Sales Head')`;
            await request.query(sqlAudit);

            let sqlUpdateCmo = `UPDATE cmo SET 
            status = 'Waiting Sales Head',flow=3 
            WHERE cmo_id = '${cmo_id}'`;
            await request.query(sqlUpdateCmo);

          }else if(kode_status==3){


            let sqlAudit = `INSERT INTO audit_cmo
            (audit_cmo_id,createdby,updatedby, cmo_id, m_user_id, actions, status)
            VALUES('${audit_cmo_id}','${m_user_id}',
            '${m_user_id}','${cmo_id}', '${m_user_id}',
            'Approve',
            'Waiting DPD')`;
            await request.query(sqlAudit);

            let sqlUpdateCmo = `UPDATE cmo SET 
            status = 'Waiting DPD',flow=4
            WHERE cmo_id = '${cmo_id}'`;
            await request.query(sqlUpdateCmo);

          }
 
          return res.success({
            result: rows,
            message: status,
          });
        }

      }else{

        return res.error({
          message: 'Data CMO tidak ditemukan'
        });

      }
      
    } catch (err) {
      return res.error(err);
    }
  },
  cmopostToSapFtp: async function (req, res) {
    await DB.poolConnect;
    const { cmo_id, nik} = req.body;
    try {
      const request = DB.pool.request();


      let getcmo = await request.query(`SELECT mdv.r_organisasi_id,
      c.flow + 1 AS flow,mdv.m_distributor_id
      FROM cmo c,m_distributor_v mdv WHERE c.cmo_id = '${cmo_id}' 
      AND mdv.m_distributor_id = c.m_distributor_id`);

      let r_organisasi_id = getcmo.recordset[0].r_organisasi_id;
      let m_distributor_id = getcmo.recordset[0].m_distributor_id;
      let flow = getcmo.recordset[0].flow;

      let emailcase = await request.query(`SELECT email_verifikasi FROM m_distributor_profile_v 
      WHERE r_organisasi_id='${r_organisasi_id}' AND rolename IN('RSDH','ASDH')`);

      let emailcase2 = await request.query(`SELECT email_verifikasi FROM email_distributor 
      WHERE m_distributor_id = '${m_distributor_id}' AND tipe='CMO'`);

      let getdataemail = await request.query(`
      SELECT DISTINCT mu.email_verifikasi
      FROM m_user mu,m_role mr 
      left join m_flow_approve mfa ON(mfa.nama = mr.nama)
      WHERE mu.r_organisasi_id = '${r_organisasi_id}'
      AND mu.role_default_id = mr.m_role_id
      AND mfa.line = ${flow}
      AND mu.email_verifikasi IS NOT NULL
      AND mu.isactive = 'Y'`);

      let dataemail = [];
      if (getdataemail.recordset.length > 0) {
        for (let i = 0; i < getdataemail.recordset.length; i++) {
          dataemail.push(getdataemail.recordset[i].email_verifikasi);
        }
      }

      if (emailcase.recordset.length > 0) {
        for (let i = 0; i < emailcase.recordset.length; i++) {
          dataemail.push(emailcase.recordset[i].email_verifikasi);
        }
      }

      if (emailcase2.recordset.length > 0) {
        for (let i = 0; i < emailcase2.recordset.length; i++) {
          dataemail.push(emailcase2.recordset[i].email_verifikasi);
        }
      }

      dataemail = _.uniq(dataemail);

      let sqlCheckKodeStatusCmo = `SELECT * FROM cmo WHERE cmo_id = '${cmo_id}'`;
      let getDataCmo = await request.query(sqlCheckKodeStatusCmo);
      let dataCmo = getDataCmo.recordset.length > 0 ? getDataCmo.recordset[0] : null;
      let kode_status = dataCmo.flow;
      console.log(kode_status);
      if(dataCmo){

        if (kode_status == 4) {

              let queryDataTable = `select x.*,kode_aktif from
              (
              SELECT 
              cmo.nomor_cmo,
              cmo.nomor_po,
              cmo.bulan,
              cmo.tahun,
              mp.item_kategori,
              '00' as spart,
              mpj.kode_channel as distribution_channel,
              rop.kode as sold_to_party,
              ro.kode as ship_to_party,
              convert(varchar,DATEADD(m, DATEDIFF(m, 0,co.schedule_date), 0), 112) as validfrom,
              convert(varchar,DATEADD(s,-1,DATEADD(mm, DATEDIFF(m,0,co.schedule_date)+1,0)), 112) as validto,
              mp.kode_sap as sku_number,
              mp.kode as sku_customer,
              cod.qty,
              mp.satuan,
              convert(varchar, co.schedule_date, 112) as delivery_date,
              cod.stok_awal as stok_awal_cycle,
              cod.doi as doi_distributor,
              cod.estimasi_sales_bulan_depan,
              cod.estimasi_sales_duabulan_kedepan,
              ro.nama,
              co.week_number
              FROM c_order co
              LEFT JOIN cmo cmo ON(cmo.cmo_id = co.cmo_id)
              LEFT JOIN c_orderdetail cod ON(cod.c_order_id = co.c_order_id AND cod.isactive='Y')
              LEFT JOIN m_produk mp ON(mp.m_produk_id = cod.m_produk_id)
              LEFT JOIN m_distributor md ON(md.m_distributor_id = cmo.m_distributor_id)
              LEFT JOIN r_distribution_channel rdc ON(rdc.r_distribution_channel_id = md.r_distribution_channel_id)
              LEFT JOIN r_organisasi ro ON(ro.r_organisasi_id = md.r_organisasi_id)
              LEFT JOIN m_pajak mpj ON(mpj.m_pajak_id = md.m_pajak_id)
              LEFT JOIN r_organisasi rop ON(rop.r_organisasi_id = mpj.r_organisasi_id)
              WHERE co.cmo_id='${cmo_id}' and cod.qty > 0 and cmo.no_sap is null
              )x left join 
              m_produk_replacement y on x.sku_number = y.kode_non_aktif`;

              let datacmo = await request.query(queryDataTable);
              let rows = datacmo.recordset;


            
              let datas = []
              for(let i = 0;i< rows.length ; i++){
                    
                  datas.push({
                      MANDT : '',
                      BSTKD : rows[i].nomor_cmo,
                      BNAME : rows[i].nomor_po,
                      AUART : rows[i].item_kategori,
                      VTWEG : rows[i].distribution_channel,
                      SPART : rows[i].spart,
                      KUNNR : rows[i].sold_to_party,
                      KUNSH : rows[i].ship_to_party,
                      GUEBG : rows[i].validfrom,
                      GUEEN : rows[i].validto,
                      MATNR : rows[i].sku_number,
                      SKU : rows[i].sku_customer,
                      WMENG : rows[i].qty,
                      VRKME : rows[i].satuan,
                      EDATU : rows[i].delivery_date,
                      STOKA : rows[i].stok_awal_cycle,
                      DOI : rows[i].doi_distributor,
                      M1 : '',
                      M2 : '',
                      VBELN : '',
                      SMATN : rows[i].kode_aktif,
                      WEEK1 : rows[i].week_number
                    });
                    
                }

                let responsesap = undefined
                if(datas.length > 0){

                  let xml = fs.readFileSync('soap/REQUEST_SOAP.xml', 'utf-8'); // saya duplicate file 'ZFM_WS_CMO.xml' ya, dan pake yg baru saya buat itu sebagai template
                    let hasil = racikXML2(xml, datas, 'ITAB');
                    lemparFTP(hasil,cmo_id);

                    await request.query(`UPDATE cmo SET status = 'Approved',
                    no_sap = 'WAITING',
                    flow = 4
                    WHERE cmo_id = '${cmo_id}'`);

                    let audit_cmo_id = uuid();
                    await request.query(`INSERT INTO audit_cmo
                    (audit_cmo_id,createdby,updatedby, cmo_id, m_user_id, actions, status)
                    VALUES('${audit_cmo_id}','${nik}',
                    '${nik}','${cmo_id}', '${nik}',
                    'Approved',
                    'Approved')`);

                
                      return res.success({
                        result: rows,
                        message: responsesap
                      });

              }else{

                      return res.success({
                        result: rows,
                        message: "No SAP sudah ada"
                      });
                    
              }

          
        } else {
          
          let queryDataTable = `SELECT 
          cmo.nomor_cmo,
          cmo.bulan,
          cmo.tahun,
          mp.item_kategori,
          '00' as spart,
          mpj.kode_channel as distribution_channel,
          rop.kode as sold_to_party,
          ro.kode as ship_to_party,
          convert(varchar,DATEADD(m, DATEDIFF(m, 0,co.schedule_date), 0), 112) as validfrom,
          convert(varchar,DATEADD(s,-1,DATEADD(mm, DATEDIFF(m,0,co.schedule_date)+1,0)), 112) as validto,
          mp.kode_sap as sku_number,
          mp.kode as sku_customer,
          cod.qty,
          mp.satuan,
          convert(varchar, co.schedule_date, 112) as delivery_date,
          cod.stok_awal as stok_awal_cycle,
          cod.doi as doi_distributor,
          cod.estimasi_sales_bulan_depan,
          cod.estimasi_sales_duabulan_kedepan,
          ro.nama
          FROM c_order co
          LEFT JOIN cmo cmo ON(cmo.cmo_id = co.cmo_id)
          LEFT JOIN c_orderdetail cod ON(cod.c_order_id = co.c_order_id)
          LEFT JOIN m_produk mp ON(mp.m_produk_id = cod.m_produk_id)
          LEFT JOIN m_distributor md ON(md.m_distributor_id = cmo.m_distributor_id)
          LEFT JOIN r_distribution_channel rdc ON(rdc.r_distribution_channel_id = md.r_distribution_channel_id)
          LEFT JOIN r_organisasi ro ON(ro.r_organisasi_id = md.r_organisasi_id)
          LEFT JOIN m_pajak mpj ON(mpj.m_pajak_id = md.m_pajak_id)
          LEFT JOIN r_organisasi rop ON(rop.r_organisasi_id = mpj.r_organisasi_id)
          WHERE co.cmo_id='${cmo_id}' and cmo.no_sap is null
          AND co.isactive = 'Y'`;
  
          console.log(queryDataTable);
          let datacmo = await request.query(queryDataTable);
          let rows = datacmo.recordset;
  
          let datauser = await request.query(`SELECT mu.r_organisasi_id,
          COALESCE(mu.nama,'nama user') AS nama 
          FROM m_user mu 
          WHERE mu.nik = '${nik}'`);

          let usernama = datauser.recordset[0].nama;
          let status = `Approve Succesfully `;
          let nomor_cmo = rows[0].nomor_cmo;
          let bulan = moment(rows[0].bulan, "MM").format("MM");
          let tahun = moment(rows[0].tahun, "YYYY").format("YYYY");
          let cmoattribute = usernama
            .concat("-")
            .concat(nomor_cmo)
            .concat("-")
            .concat(bulan)
            .concat("-")
            .concat(tahun);
  
          if (dataemail.length > 0) {
            SendEmail(
              dataemail.toString(),
              cmoattribute,
              `<b>CMO Approved</b>`,
              async (err, info) => {
                if (err) {
                  await request.query(`INSERT INTO log_email
                          (createdby, updatedby,proses,accepted,rejected,envelope, response)
                          VALUES('${nik}','${nik}', 'Error Email','${err}',
                          '${err}','${err}','${err}')`);
                } else {
                  console.log("info", info);
                  let from = info.envelope.from;
                  let to = info.envelope.to.toString();
                  let envelope = from.concat(" send to ").concat(to);
                  await request.query(`INSERT INTO log_email
                          (createdby, updatedby,proses,accepted,rejected,envelope, response)
                          VALUES('${nik}','${nik}', 'Approve CMO','${info.accepted.toString()}',
                          '${info.rejected.toString()}','${envelope}','${
                    info.response
                  }')`);
                }
              }
            );
          }
  
          let audit_cmo_id = uuid();
   
          if(kode_status==2){

            let sqlAudit = `INSERT INTO audit_cmo
            (audit_cmo_id,createdby,updatedby, cmo_id, m_user_id, actions, status)
            VALUES('${audit_cmo_id}','${nik}',
            '${nik}','${cmo_id}', '${nik}',
            'Approve',
            'Waiting Sales Head')`;
            await request.query(sqlAudit);

            console.log(sqlAudit,"================");

            let sqlUpdateCmo = `UPDATE cmo SET 
            status = 'Waiting Sales Head',flow=3 
            WHERE cmo_id = '${cmo_id}'`;
            await request.query(sqlUpdateCmo);

          }else if(kode_status==3){


            let sqlAudit = `INSERT INTO audit_cmo
            (audit_cmo_id,createdby,updatedby, cmo_id, m_user_id, actions, status)
            VALUES('${audit_cmo_id}','${nik}',
            '${nik}','${cmo_id}', '${nik}',
            'Approve',
            'Waiting DPD')`;
            await request.query(sqlAudit);

            let sqlUpdateCmo = `UPDATE cmo SET 
            status = 'Waiting DPD',flow=4
            WHERE cmo_id = '${cmo_id}'`;
            await request.query(sqlUpdateCmo);

          }
 
          return res.success({
            result: rows,
            message: status,
          });
        }

      }else{

        return res.error({
          message: 'Data CMO tidak ditemukan'
        });

      }
      
    } catch (err) {
      return res.error(err);
    }
  },
  orderTosap: async function (req, res) {
    await DB.poolConnect;
    const { startdate, enddate } = req.body;
    const request = DB.pool.request();
    let sqlgetstatusIntegasi = `SELECT TOP 1 * FROM integration_url ORDER BY created DESC`;
    let datastatusIntegasi = await request.query(sqlgetstatusIntegasi);
    let statusIntegasi =
      datastatusIntegasi.recordset.length > 0
        ? datastatusIntegasi.recordset[0].status
        : "DEV";

    let url = ``;
    if (statusIntegasi == "DEV") {
      url =
        "http://sapdevene.enesis.com:8010/sap/bc/srt/rfc/sap/zws_cmo_soweek/120/zws_cmo_soweek/zbn_cmo_soweek"; // development
    } else {
      url =
        "http://sapprdene.enesis.com:8310/sap/bc/srt/rfc/sap/zws_cmo_soweek/300/zws_cmo_soweek/zbn_cmo_soweek"; // production
    }

    let usernamesoap = sails.config.globals.usernamesoap;
    let passwordsoap = sails.config.globals.passwordsoap;
    const tok = `${usernamesoap}:${passwordsoap}`;
    const hash = Base64.encode(tok);
    const Basic = "Basic " + hash;
    try {
      const request = DB.pool.request();

      let queryDataTable = `
    SELECT cmo.no_sap,
    co.schedule_date,
    co.week_number,co.c_order_id 
    FROM cmo cmo,c_order co,m_distributor_v mdv
    WHERE co.cmo_id = cmo.cmo_id
    AND co.schedule_date BETWEEN '${startdate}' AND '${startdate}'
    AND cmo.no_sap IS NOT NULL
    AND (co.nomor_sap IS NULL OR co.nomor_sap='Fail' OR co.nomor_sap='')
    AND cmo.isactive = 'Y'
    AND mdv.m_distributor_id = cmo.m_distributor_id
    ORDER BY mdv.kode`;

      let datacmo = await request.query(queryDataTable);
      let rows = datacmo.recordset;
      let datas = [];

      let orders = [];

      for (let i = 0; i < rows.length; i++) {
        datas.push({
          SDATU: startdate,
          VBELN: rows[i].no_sap,
        });

        orders.push({
          c_order_id: rows[i].c_order_id,
        });
      }

      let responsesap = [];
      if (datas.length > 0) {
        let sampleHeaders = {
          Authorization: Basic,
          "user-agent": "esalesSystem",
          "Content-Type": "text/xml;charset=UTF-8",
          soapAction:
            "urn:sap-com:document:sap:rfc:functions:ZWS_CMO_SOWEEK:ZFM_WS_SORequest",
        };

        let xml = fs.readFileSync("soap/ZFM_WS_CMO_MINGGUAN.xml", "utf-8");

        for (let i = 0; i < datas.length; i++) {
          let hasil = await racikXMLMingguanObject(
            xml,
            datas[i],
            "urn:ZFM_WS_SO"
          );
          let c_order_id = orders[i].c_order_id;
          let { response } = await soapRequest({
            url: url,
            headers: sampleHeaders,
            xml: hasil,
            timeout: 1000000,
          }); // Optional timeout parameter(milliseconds)
          let { body, statusCode } = response;

          if (statusCode == 200) {
            let parsedXML = await xml2js.parseStringPromise(body);
            let SOWEEK =
              parsedXML["soap-env:Envelope"]["soap-env:Body"][0][
                "n0:ZFM_WS_SOResponse"
              ][0].SOWEEK[0];
            let STATUS =
              parsedXML["soap-env:Envelope"]["soap-env:Body"][0][
                "n0:ZFM_WS_SOResponse"
              ][0].STATUS[0];

            let keterangan = "";
            if (STATUS == "N") {
              keterangan = "Not Approve";
            } else if (STATUS == "A") {
              keterangan = "Approve";
            }

            await request.query(`UPDATE c_order SET status = '${keterangan}',
                      nomor_sap = '${SOWEEK}',kode_status='${STATUS}'
                      WHERE c_order_id = '${c_order_id}'`);

            let data = {
              status: statusCode,
              data: {
                SOWEEK: SOWEEK,
                STATUS: STATUS,
              },
            };
            responsesap.push(data);
          }
        }

        return res.success({
          result: rows,
          message: responsesap,
        });
      } else {
        return res.success({
          result: rows,
          message: "SO Tidak ditemukan",
        });
      }
    } catch (err) {
      return res.error(err);
    }
  },

  orderTosapPlace: async function (req, res) {
    await DB.poolConnect;
    const { orderdate, nomor_cmo } = req.body;

    let sqlgetstatusIntegasi = `SELECT TOP 1 * FROM integration_url ORDER BY created DESC`;
    let datastatusIntegasi = await request.query(sqlgetstatusIntegasi);
    let statusIntegasi =
      datastatusIntegasi.recordset.length > 0
        ? datastatusIntegasi.recordset[0].status
        : "DEV";

    let url = ``;
    if (statusIntegasi == "DEV") {
      url =
        "http://sapdevene.enesis.com:8010/sap/bc/srt/rfc/sap/zws_cmo_soweek/120/zws_cmo_soweek/zbn_cmo_soweek"; // development
    } else {
      url =
        "http://sapprdene.enesis.com:8310/sap/bc/srt/rfc/sap/zws_cmo_soweek/300/zws_cmo_soweek/zbn_cmo_soweek"; // production
    }

    let usernamesoap = sails.config.globals.usernamesoap;
    let passwordsoap = sails.config.globals.passwordsoap;
    const tok = `${usernamesoap}:${passwordsoap}`;
    const hash = Base64.encode(tok);
    const Basic = "Basic " + hash;
    try {
      const request = DB.pool.request();

      let queryDataTable = `
    SELECT cmo.no_sap,
    co.schedule_date,
    co.week_number,co.c_order_id 
    FROM cmo cmo,c_order co
    WHERE co.cmo_id = cmo.cmo_id
    AND co.schedule_date = '${orderdate}'
    AND cmo.no_sap = '${nomor_cmo}'
    AND cmo.isactive = 'Y'`;

      console.log(queryDataTable);

      let datacmo = await request.query(queryDataTable);
      let rows = datacmo.recordset;
      let datas = [];

      let orders = [];

      for (let i = 0; i < rows.length; i++) {
        datas.push({
          SDATU: orderdate,
          VBELN: nomor_cmo,
        });

        orders.push({
          c_order_id: rows[i].c_order_id,
        });
      }

      let responsesap = [];
      if (datas.length > 0) {
        let sampleHeaders = {
          Authorization: Basic,
          "user-agent": "esalesSystem",
          "Content-Type": "text/xml;charset=UTF-8",
          soapAction:
            "urn:sap-com:document:sap:rfc:functions:ZWS_CMO_SOWEEK:ZFM_WS_SORequest",
        };

        let xml = fs.readFileSync("soap/ZFM_WS_CMO_MINGGUAN.xml", "utf-8");

        for (let i = 0; i < datas.length; i++) {
          let hasil = await racikXMLMingguanObject(
            xml,
            datas[i],
            "urn:ZFM_WS_SO"
          );
          let c_order_id = orders[i].c_order_id;
          let { response } = await soapRequest({
            url: url,
            headers: sampleHeaders,
            xml: hasil,
            timeout: 1000000,
          }); // Optional timeout parameter(milliseconds)
          let { body, statusCode } = response;

          if (statusCode == 200) {
            let parsedXML = await xml2js.parseStringPromise(body);
            let SOWEEK =
              parsedXML["soap-env:Envelope"]["soap-env:Body"][0][
                "n0:ZFM_WS_SOResponse"
              ][0].SOWEEK[0];
            let STATUS =
              parsedXML["soap-env:Envelope"]["soap-env:Body"][0][
                "n0:ZFM_WS_SOResponse"
              ][0].STATUS[0];

            let keterangan = "";
            if (STATUS == "N") {
              keterangan = "Not Approve";
            } else if (STATUS == "A") {
              keterangan = "Approve";
            }

            await request.query(`UPDATE c_order SET status = '${keterangan}',
                      nomor_sap = '${SOWEEK}',kode_status='${STATUS}'
                      WHERE c_order_id = '${c_order_id}'`);

            let data = {
              status: statusCode,
              data: {
                SOWEEK: SOWEEK,
                STATUS: STATUS,
              },
            };
            responsesap.push(data);
          }
        }

        return res.success({
          result: rows,
          message: responsesap,
        });
      } else {
        return res.success({
          result: rows,
          message: "SO Tidak ditemukan",
        });
      }
    } catch (err) {
      return res.error(err);
    }
  },
  orderTosapPlaceProd: async function (req, res) {
    await DB.poolConnect;
    const { orderdate, nomor_cmo } = req.body;

    let sqlgetstatusIntegasi = `SELECT TOP 1 * FROM integration_url ORDER BY created DESC`;
    let datastatusIntegasi = await request.query(sqlgetstatusIntegasi);
    let statusIntegasi =
      datastatusIntegasi.recordset.length > 0
        ? datastatusIntegasi.recordset[0].status
        : "DEV";

    let url = ``;
    if (statusIntegasi == "DEV") {
      url =
        "http://sapdevene.enesis.com:8010/sap/bc/srt/rfc/sap/zws_cmo_soweek/120/zws_cmo_soweek/zbn_cmo_soweek"; // development
    } else {
      url =
        "http://sapprdene.enesis.com:8310/sap/bc/srt/rfc/sap/zws_cmo_soweek/300/zws_cmo_soweek/zbn_cmo_soweek"; // production
    }

    let usernamesoap = sails.config.globals.usernamesoap;
    let passwordsoap = sails.config.globals.passwordsoap;
    const tok = `${usernamesoap}:${passwordsoap}`;
    const hash = Base64.encode(tok);
    const Basic = "Basic " + hash;
    try {
      const request = DB.pool.request();

      let queryDataTable = `
    SELECT cmo.no_sap,
    co.schedule_date,
    co.week_number,co.c_order_id 
    FROM cmo cmo,c_order co
    WHERE co.cmo_id = cmo.cmo_id
    AND co.schedule_date = '${orderdate}'
    AND cmo.no_sap = '${nomor_cmo}'
    AND cmo.isactive = 'Y'`;

      console.log(queryDataTable);

      let datacmo = await request.query(queryDataTable);
      let rows = datacmo.recordset;
      let datas = [];

      let orders = [];

      for (let i = 0; i < rows.length; i++) {
        datas.push({
          SDATU: orderdate,
          VBELN: nomor_cmo,
        });

        orders.push({
          c_order_id: rows[i].c_order_id,
        });
      }

      let responsesap = [];
      if (datas.length > 0) {
        let sampleHeaders = {
          Authorization: Basic,
          "user-agent": "esalesSystem",
          "Content-Type": "text/xml;charset=UTF-8",
          soapAction:
            "urn:sap-com:document:sap:rfc:functions:ZWS_CMO_SOWEEK:ZFM_WS_SORequest",
        };

        let xml = fs.readFileSync("soap/ZFM_WS_CMO_MINGGUAN.xml", "utf-8");

        for (let i = 0; i < datas.length; i++) {
          let hasil = await racikXMLMingguanObject(
            xml,
            datas[i],
            "urn:ZFM_WS_SO"
          );
          let c_order_id = orders[i].c_order_id;
          let { response } = await soapRequest({
            url: url,
            headers: sampleHeaders,
            xml: hasil,
            timeout: 1000000,
          }); // Optional timeout parameter(milliseconds)
          let { body, statusCode } = response;

          if (statusCode == 200) {
            let parsedXML = await xml2js.parseStringPromise(body);
            let SOWEEK =
              parsedXML["soap-env:Envelope"]["soap-env:Body"][0][
                "n0:ZFM_WS_SOResponse"
              ][0].SOWEEK[0];
            let STATUS =
              parsedXML["soap-env:Envelope"]["soap-env:Body"][0][
                "n0:ZFM_WS_SOResponse"
              ][0].STATUS[0];

            let keterangan = "";
            if (STATUS == "N") {
              keterangan = "Not Approve";
            } else if (STATUS == "A") {
              keterangan = "Approve";
            }

            await request.query(`UPDATE c_order SET status = '${keterangan}',
                      nomor_sap = '${SOWEEK}',kode_status='${STATUS}'
                      WHERE c_order_id = '${c_order_id}'`);

            let data = {
              status: statusCode,
              data: {
                SOWEEK: SOWEEK,
                STATUS: STATUS,
              },
            };
            responsesap.push(data);
          }
        }

        return res.success({
          result: rows,
          message: responsesap,
        });
      } else {
        return res.success({
          result: rows,
          message: "SO Tidak ditemukan",
        });
      }
    } catch (err) {
      return res.error(err);
    }
  },
  cekCreditLimit: async function (req, res) {
    await DB.poolConnect;
    const { startdate, enddate } = req.body;

    const today = moment();
    const dateaudit = today.format("YYYY-MM-DD");

    let sqlgetstatusIntegasi = `SELECT TOP 1 * FROM integration_url ORDER BY created DESC`;
    let datastatusIntegasi = await request.query(sqlgetstatusIntegasi);
    let statusIntegasi =
      datastatusIntegasi.recordset.length > 0
        ? datastatusIntegasi.recordset[0].status
        : "DEV";

    let url = ``;
    if (statusIntegasi == "DEV") {
      url =
        "http://sapdevene.enesis.com:8010/sap/bc/srt/rfc/sap/zws_cmo_limit/120/zws_cmo_limit/zbn_cmo_limit"; // development
    } else {
      url =
        "http://sapprdene.enesis.com:8310/sap/bc/srt/rfc/sap/zws_cmo_limit/300/zws_cmo_limit/zbn_cmo_limit"; // production
    }

    let usernamesoap = sails.config.globals.usernamesoap;
    let passwordsoap = sails.config.globals.passwordsoap;
    const tok = `${usernamesoap}:${passwordsoap}`;
    const hash = Base64.encode(tok);
    const Basic = "Basic " + hash;
    try {
      const request = DB.pool.request();

      let queryDataTable = `SELECT co.nomor_sap,
    co.schedule_date,
    co.week_number,co.c_order_id 
    from cmo cmo,c_order co
    where co.cmo_id = cmo.cmo_id
    AND co.schedule_date BETWEEN '${startdate}' AND '${enddate}'
    AND cmo.no_sap IS NOT NULL
    AND co.nomor_sap IS NOT NULL
    AND co.kode_status = 'N'
    AND cmo.isactive = 'Y'`;

      let datacmo = await request.query(queryDataTable);
      let rows = datacmo.recordset;
      let datas = [];

      for (let i = 0; i < rows.length; i++) {
        datas.push({
          VBELN: rows[i].nomor_sap,
        });
      }

      let responsesap = [];
      if (datas.length > 0) {
        let sampleHeaders = {
          Authorization: Basic,
          "user-agent": "esalesSystem",
          "Content-Type": "text/xml;charset=UTF-8",
          soapAction:
            "urn:sap-com:document:sap:rfc:functions:ZWS_CMO_SOWEEK:ZFM_WS_SORequest",
        };

        let xml = fs.readFileSync("soap/ZFM_WS_CMO_CREDIT_LIMIT.xml", "utf-8");
        let hasil = racikXML(xml, datas, "ITAB");

        let { response } = await soapRequest({
          url: url,
          headers: sampleHeaders,
          xml: hasil,
          timeout: 1000000,
        }); // Optional timeout parameter(milliseconds)
        let { body, statusCode } = response;

        if (statusCode == 200) {
          let parsedXML = await xml2js.parseStringPromise(body);
          let item =
            parsedXML["soap-env:Envelope"]["soap-env:Body"][0][
              "n0:ZFG_WS_LIMITCEKResponse"
            ][0]["RESULT"][0].item;

          for (let i = 0; i < item.length; i++) {
            let nomor_so = item[i].VBELN[0];
            let status = item[i].STATUS[0];

            console.log("nomor_so ", nomor_so);
            console.log("status ", status);

            if (status === "R") {
              let SqlSelect = `SELECT co.c_order_id,mdv.r_organisasi_id,
                        ro.nama,co.week_number,c.nomor_cmo,c.bulan,c.tahun,co.schedule_date
                        FROM c_order co,cmo c,m_distributor_v mdv,r_organisasi ro  
                        WHERE co.cmo_id = c.cmo_id
                        AND c.m_distributor_id = mdv.m_distributor_id
                        AND co.nomor_sap = '${nomor_so}'
                        AND ro.r_organisasi_id = mdv.r_organisasi_id`;
              let rows = await request.query(SqlSelect);
              let order = rows.recordset[0];
              let c_order_id = order.c_order_id;
              let week_number = order.week_number;
              let r_organisasi_id = order.r_organisasi_id;
              let nomor_cmo = order.nomor_cmo;
              let bulan = order.bulan;
              let tahun = order.tahun;
              let usernama = order.nama;
              let c_shipment_id = uuid();

              let updateCmoNumber = ``;
              if (week_number == 1) {
                updateCmoNumber = `UPDATE cmo
                          SET nomor_so_1='${nomor_so}'
                          WHERE cmo_id = '${c_order_id}'`;
                await request.query(updateCmoNumber);
              } else if (week_number == 2) {
                updateCmoNumber = `UPDATE cmo
                          SET nomor_so_2='${nomor_so}'
                          WHERE cmo_id = '${c_order_id}'`;
                await request.query(updateCmoNumber);
              } else if (week_number == 3) {
                updateCmoNumber = `UPDATE cmo
                          SET nomor_so_3='${nomor_so}'
                          WHERE cmo_id = '${c_order_id}'`;
                await request.query(updateCmoNumber);
              } else if (week_number == 4) {
                updateCmoNumber = `UPDATE cmo
                          SET nomor_so_4='${nomor_so}'
                          WHERE cmo_id = '${c_order_id}'`;
                await request.query(updateCmoNumber);
              }

              let SqlUpdate = `UPDATE c_order SET kode_status='R',
                        status='Approve' WHERE c_order_id = '${c_order_id}'`;
              await request.query(SqlUpdate);

              await request.query(SqlInsert);
              let getdataemail =
                await request.query(`SELECT DISTINCT mu.email_verifikasi
                        FROM m_user_organisasi muo,m_user mu,m_role mr 
                        left join m_flow_approve mfa ON(mfa.nama = mr.nama)
                        WHERE muo.r_organisasi_id = '${r_organisasi_id}'
                        AND muo.m_user_id = mu.m_user_id
                        AND mu.role_default_id = mr.m_role_id
                        AND mu.email_verifikasi IS NOT NULL`);

              let dataemail = [];
              for (let i = 0; i < getdataemail.recordset.length; i++) {
                dataemail.push(getdataemail.recordset[i].email_verifikasi);
              }

              if (dataemail.length > 0) {
                let sqlgetSummaryBrand = `SELECT SUM(total_order) AS totalOrder FROM c_orderdetail co WHERE co.c_order_id = '${c_order_id}'`;
                let getsummaryorder = await request.query(sqlgetSummaryBrand);
                let totalAmountAll = getsummaryorder.recordset[0].totalOrder;

                const amount = numeral(totalAmountAll)
                  .format("0,0")
                  .replace(/,/g, ".");
                const bulannya = moment(bulan, "MM").format("MMMM");
                totalTonase = Math.round(totalTonase);

                const param = {
                  subject: `Status SO (${nomor_so}) telah rilis`,
                  distributor: usernama,
                  noso: nomor_so,
                  nocmo: nomor_cmo,
                  bulan: bulannya.concat("-").concat(tahun),
                  mingguke: `Minggu Ke-${week_number}`,
                  totalamount: `Rp. ${amount}`,
                  status: "Approved Credit Limit",
                };

                const template = await sails.helpers.generateHtmlEmail.with({
                  htmltemplate: "sotemplate",
                  templateparam: param,
                });
                SendEmail(dataemail.toString(), param.subject, template);
              }
            } else {
              let SqlSelectOrder = `SELECT co.c_order_id,mdv.r_organisasi_id,mdv.m_distributor_id,
                        ro.nama,co.week_number,c.nomor_cmo,c.bulan,c.tahun,co.schedule_date
                        FROM c_order co,cmo c,m_distributor_v mdv,r_organisasi ro  
                        WHERE co.cmo_id = c.cmo_id
                        AND c.m_distributor_id = mdv.m_distributor_id
                        AND co.nomor_sap = '${nomor_so}'
                        AND ro.r_organisasi_id = mdv.r_organisasi_id`;

              let rows = await request.query(SqlSelectOrder);
              let order = rows.recordset[0];
              let c_order_id = order.c_order_id;
              //let week_number = order.week_number;
              //let r_organisasi_id = order.r_organisasi_id;
              let m_distributor_id = order.m_distributor_id;
              // let nomor_cmo = order.nomor_cmo;
              // let bulan = order.bulan;
              // let tahun = order.tahun;
              // let usernama = order.nama;

              // let SqlSelectAuditPlafond = `SELECT COUNT(1) AS total_rows FROM audit_plafond WHERE c_order_id='${c_order_id}'
              // AND m_distributor_id = '${m_distributor_id}'`;
              // let datarows = await request.query(SqlSelectAuditPlafond);
              // let audit = datarows.recordset[0].total_rows;

              let SqlSelectAudit = `SELECT COUNT(1) AS total_rows FROM audit_credit_limit WHERE c_order_id='${c_order_id}' 
                        AND m_distributor_id = '${m_distributor_id}' AND dateaudit='${dateaudit}'`;
              console.log(SqlSelectAudit);
              let datarows = await request.query(SqlSelectAudit);
              let audit = datarows.recordset[0].total_rows;

              if (audit.length == 0) {
                // let InsertAudit = `INSERT INTO audit_plafond
                //                   (c_order_id, m_distributor_id)
                //                   VALUES('${c_order_id}', '${m_distributor_id}')`;
                //                   await request.query(InsertAudit);

                // let dataemail = ['tiasadeputra@gmail.com','indra.suandi@enesis.com'];
                let SqlSelect = `SELECT co.c_order_id,mdv.r_organisasi_id,
                          ro.nama,co.week_number,c.nomor_cmo,c.bulan,c.tahun,co.schedule_date
                          FROM c_order co,cmo c,m_distributor_v mdv,r_organisasi ro  
                          WHERE co.cmo_id = c.cmo_id
                          AND c.m_distributor_id = mdv.m_distributor_id
                          AND co.nomor_sap = '${nomor_so}'
                          AND ro.r_organisasi_id = mdv.r_organisasi_id`;
                let rows = await request.query(SqlSelect);
                let order = rows.recordset[0];
                let c_order_id = order.c_order_id;
                let week_number = order.week_number;
                let r_organisasi_id = order.r_organisasi_id;
                let nomor_cmo = order.nomor_cmo;
                let bulan = order.bulan;
                let tahun = order.tahun;
                let usernama = order.nama;

                let sqlgetSummaryBrand = `SELECT SUM(total_order) AS totalOrder FROM c_orderdetail co WHERE co.c_order_id = '${c_order_id}'`;
                let getsummaryorder = await request.query(sqlgetSummaryBrand);
                let totalAmountAll = getsummaryorder.recordset[0].totalOrder;

                const amount = numeral(totalAmountAll)
                  .format("0,0")
                  .replace(/,/g, ".");
                const bulannya = moment(bulan, "MM").format("MMMM");
                totalTonase = Math.round(totalTonase);

                const param = {
                  subject: `Status SO (${nomor_so}) telah rilis`,
                  distributor: usernama,
                  noso: nomor_so,
                  nocmo: nomor_cmo,
                  bulan: bulannya.concat("-").concat(tahun),
                  mingguke: `Minggu Ke-${week_number}`,
                  totalamount: `Rp. ${amount}`,
                  status: "Not Approve Credit Limit",
                };

                const template = await sails.helpers.generateHtmlEmail.with({
                  htmltemplate: "sotemplate",
                  templateparam: param,
                });
                SendEmail(dataemail.toString(), param.subject, template);

                let InsertAudit = `INSERT INTO audit_credit_limit
                                            (c_order_id,m_distributor_id,dateaudit)
                                            VALUES('${c_order_id}', '${m_distributor_id}','${dateaudit}')`;
                console.log(InsertAudit);
                await request.query(InsertAudit);
              }
            }

            return res.status(200).send("SO Tidak ada yang approve");
          }
        } else {
          return res.status(200).send("SO Tidak ditemukan");
        }
      } else {
        return res.status(200).send("SO Tidak ditemukan");
      }
    } catch (err) {
      return res.error(err);
    }
  },

  orderTosapByDPD: async function (req, res) {
    const { periode, week } = req.body;
    let bulan = periode ? moment(periode, "YYYY-MM").format("MM") : undefined;
    let tahun = periode ? moment(periode, "YYYY-MM").format("YYYY") : undefined;

    let usernamesoap = sails.config.globals.usernamesoap;
    let passwordsoap = sails.config.globals.passwordsoap;
    const tok = `${usernamesoap}:${passwordsoap}`;
    const hash = Base64.encode(tok);
    const Basic = "Basic " + hash;
    await DB.poolConnect;
    try {
      const request = DB.pool.request();

      let sqlgetstatusIntegasi = `SELECT TOP 1 * FROM integration_url ORDER BY created DESC`;
      let datastatusIntegasi = await request.query(sqlgetstatusIntegasi);
      let statusIntegasi =
        datastatusIntegasi.recordset.length > 0
          ? datastatusIntegasi.recordset[0].status
          : "DEV";

      let url = ``;
      if (statusIntegasi == "DEV") {
        url =
          "http://sapdevene.enesis.com:8010/sap/bc/srt/rfc/sap/zws_cmo_soweek/120/zws_cmo_soweek/zbn_cmo_soweek"; // development
      } else {
        url =
          "http://sapprdene.enesis.com:8310/sap/bc/srt/rfc/sap/zws_cmo_soweek/300/zws_cmo_soweek/zbn_cmo_soweek"; // production
      }

      let queryDataTable = `
    SELECT cmo.no_sap,
    co.schedule_date,
    co.week_number,co.c_order_id 
    FROM cmo cmo,c_order co,m_distributor_v mdv
    WHERE co.cmo_id = cmo.cmo_id
    AND cmo.no_sap IS NOT NULL
    AND cmo.bulan = ${parseInt(bulan)}
    and cmo.tahun = ${parseInt(tahun)}
    AND co.week_number= ${parseInt(week)}
    AND (co.nomor_sap IS NULL OR co.nomor_sap='Fail' OR co.nomor_sap='')
    AND cmo.isactive = 'Y'
    and co.isactive = 'Y'
    AND mdv.m_distributor_id = cmo.m_distributor_id
    ORDER BY mdv.kode`;

      console.log(queryDataTable);
      let datacmo = await request.query(queryDataTable);
      let rows = datacmo.recordset;
      console.log(rows);

      let datas = [];

      let orders = [];

      for (let i = 0; i < rows.length; i++) {
        datas.push({
          SDATU: rows[i].schedule_date
            ? moment(rows[i].schedule_date, "YYYY-MM-DD").format("YYYY-MM-DD")
            : "",
          VBELN: rows[i].no_sap,
        });

        orders.push({
          c_order_id: rows[i].c_order_id,
        });
      }

      console.log(datas);

      let responsesap = [];
      if (datas.length > 0) {
        let sampleHeaders = {
          Authorization: Basic,
          "user-agent": "esalesSystem",
          "Content-Type": "text/xml;charset=UTF-8",
          soapAction:
            "urn:sap-com:document:sap:rfc:functions:ZWS_CMO_SOWEEK:ZFM_WS_SORequest",
        };

        let xml = fs.readFileSync("soap/ZFM_WS_CMO_MINGGUAN.xml", "utf-8");

        for (let i = 0; i < datas.length; i++) {
          let hasil = await racikXMLMingguanObject(
            xml,
            datas[i],
            "urn:ZFM_WS_SO"
          );
          let c_order_id = orders[i].c_order_id;
          let { response } = await soapRequest({
            url: url,
            headers: sampleHeaders,
            xml: hasil,
            timeout: 1000000,
          }); // Optional timeout parameter(milliseconds)
          let { body, statusCode } = response;

          console.log("statusCode ", statusCode);
          if (statusCode == 200) {
            let parsedXML = await xml2js.parseStringPromise(body);
            let SOWEEK =
              parsedXML["soap-env:Envelope"]["soap-env:Body"][0][
                "n0:ZFM_WS_SOResponse"
              ][0].SOWEEK[0];
            let STATUS =
              parsedXML["soap-env:Envelope"]["soap-env:Body"][0][
                "n0:ZFM_WS_SOResponse"
              ][0].STATUS[0];
            console.log("statusCode ", statusCode, SOWEEK, STATUS);
            let keterangan = "";
            if (STATUS == "N") {
              keterangan = "Not Approve";
            } else if (STATUS == "A") {
              keterangan = "Approve";
            } else if (STATUS == "R") {
              keterangan = "Approve";
            }

            await request.query(`UPDATE c_order SET status = '${keterangan}',
                      nomor_sap = '${SOWEEK}',kode_status='${STATUS}'
                      WHERE c_order_id = '${c_order_id}'`);

            let data = {
              status: statusCode,
              data: {
                SOWEEK: SOWEEK,
                STATUS: STATUS,
              },
            };
            responsesap.push(data);
          }
        }

        return res.success({
          result: rows,
          message: responsesap,
        });
      } else {
        return res.error({
          message: "Week CMO Tidak ditemukan",
        });
      }
    } catch (err) {
      return res.error(err);
    }
  },
  orderTosapByDPDFtp: async function (req, res) {
    const { periode, week } = req.body;
    console.log("pxxx");
    let bulan = periode ? moment(periode, "YYYY-MM").format("MM") : undefined;
    let tahun = periode ? moment(periode, "YYYY-MM").format("YYYY") : undefined;

    let usernamesoap = sails.config.globals.usernamesoap;
    let passwordsoap = sails.config.globals.passwordsoap;
    const tok = `${usernamesoap}:${passwordsoap}`;
    const hash = Base64.encode(tok);
    const Basic = "Basic " + hash;
    await DB.poolConnect;
    try {
      const request = DB.pool.request();

      let url = ``;

      let queryDataTable = `
      SELECT cmo.no_sap,
      co.schedule_date,
      co.week_number,co.c_order_id 
      FROM cmo cmo,c_order co,m_distributor_v mdv
      WHERE co.cmo_id = cmo.cmo_id
      AND cmo.no_sap IS NOT NULL
      AND cmo.bulan = ${parseInt(bulan)}
      and cmo.tahun = ${parseInt(tahun)}
      AND co.week_number= ${parseInt(week)}
      AND (co.nomor_sap IS NULL OR co.nomor_sap='Fail' OR co.nomor_sap='')
      AND cmo.isactive = 'Y'
      and co.isactive = 'Y'
      AND mdv.m_distributor_id = cmo.m_distributor_id
      ORDER BY mdv.kode`;

      console.log(queryDataTable);
      let datacmo = await request.query(queryDataTable);
      let rows = datacmo.recordset;
      console.log(rows);

      let datas = [];

      let orders = [];

      for (let i = 0; i < rows.length; i++) {
        datas.push({
          KEYS: rows[i].c_order_id,
          VBELN: rows[i].no_sap,
          SDATU: rows[i].schedule_date
            ? moment(rows[i].schedule_date, "YYYY-MM-DD").format("YYYY-MM-DD")
            : "",
        });

        orders.push({
          c_order_id: rows[i].c_order_id,
        });
      }

      let queryUpdate = ` update c_order set nomor_sap = 'WAITING' where c_order_id in (
      SELECT co.c_order_id 
      FROM cmo cmo,c_order co,m_distributor_v mdv
      WHERE co.cmo_id = cmo.cmo_id
      AND cmo.no_sap IS NOT NULL
      AND cmo.bulan = ${parseInt(bulan)}
      and cmo.tahun = ${parseInt(tahun)}
      AND co.week_number= ${parseInt(week)}
      AND (co.nomor_sap IS NULL OR co.nomor_sap='Fail' OR co.nomor_sap='')
      AND cmo.isactive = 'Y'
      and co.isactive = 'Y'
      AND mdv.m_distributor_id = cmo.m_distributor_id )`;

      console.log(queryUpdate);
      await request.query(queryUpdate);

      let responsesap = [];
      if (datas.length > 0) {
        let xml = fs.readFileSync("soap/REQUEST_SOAP.xml", "utf-8");
        let hasil = await racikXML2(xml, datas, "ITAB");

        let c_order_id = `WEEK-${week}-${periode}`;
        let remotePath =
          "/home/sapftp/esales/soweek/request/" + `${c_order_id}.xml`;

        let sqlgetstatusIntegasi = `SELECT TOP 1 * FROM integration_url ORDER BY created DESC`;
        let datastatusIntegasi = await request.query(sqlgetstatusIntegasi);
        let statusIntegasi =
          datastatusIntegasi.recordset.length > 0
            ? datastatusIntegasi.recordset[0].status
            : "DEV";

        if (statusIntegasi == "DEV") {
          remotePath = "/home/sapftp/esales/dev/so/" + `${c_order_id}.xml`;
        }

        let dst = dokumentPath("SOWEEK", "request") + "/" + `${c_order_id}.xml`;
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

        let updateso = `update c_order set nomor_sap = 'WAITING' where c_order_id = '${c_order_id}'`;
        await request.query(updateso);
        return res.success({
          result: rows,
          message: responsesap,
        });
      } else {
        return res.error({
          message: "Week CMO Tidak ditemukan",
        });
      }
    } catch (err) {
      return res.error(err);
    }
  },

  orderTosapRegenerate: async function (req, res) {
    const { periode, week } = req.body;
    console.log("pxxx");
    let bulan = periode ? moment(periode, "YYYY-MM").format("MM") : undefined;
    let tahun = periode ? moment(periode, "YYYY-MM").format("YYYY") : undefined;

    let usernamesoap = sails.config.globals.usernamesoap;
    let passwordsoap = sails.config.globals.passwordsoap;
    const tok = `${usernamesoap}:${passwordsoap}`;
    const hash = Base64.encode(tok);
    const Basic = "Basic " + hash;
    await DB.poolConnect;
    try {
      const request = DB.pool.request();

      let url = ``;

      let queryDataTable = `
      SELECT cmo.no_sap,
      co.schedule_date,
      co.week_number,co.c_order_id 
      FROM cmo cmo,c_order co,m_distributor_v mdv
      WHERE co.cmo_id = cmo.cmo_id
      AND cmo.no_sap IS NOT NULL
      AND cmo.bulan = ${parseInt(bulan)}
      and cmo.tahun = ${parseInt(tahun)}
      AND co.week_number= ${parseInt(week)}
      AND (co.nomor_sap IS NULL OR co.nomor_sap='Fail' OR co.nomor_sap='' OR co.nomor_sap='WAITING')
      AND cmo.isactive = 'Y'
      and co.isactive = 'Y'
      AND mdv.m_distributor_id = cmo.m_distributor_id
      ORDER BY mdv.kode`;

      console.log(queryDataTable);
      let datacmo = await request.query(queryDataTable);
      let rows = datacmo.recordset;
      console.log(rows);

      let datas = [];

      let orders = [];

      for (let i = 0; i < rows.length; i++) {
        datas.push({
          KEYS: rows[i].c_order_id,
          VBELN: rows[i].no_sap,
          SDATU: rows[i].schedule_date
            ? moment(rows[i].schedule_date, "YYYY-MM-DD").format("YYYY-MM-DD")
            : "",
        });

        orders.push({
          c_order_id: rows[i].c_order_id,
        });
      }

      let queryUpdate = ` update c_order set nomor_sap = 'WAITING' where c_order_id in (
      SELECT co.c_order_id 
      FROM cmo cmo,c_order co,m_distributor_v mdv
      WHERE co.cmo_id = cmo.cmo_id
      AND cmo.no_sap IS NOT NULL
      AND cmo.bulan = ${parseInt(bulan)}
      and cmo.tahun = ${parseInt(tahun)}
      AND co.week_number= ${parseInt(week)}
      AND (co.nomor_sap IS NULL OR co.nomor_sap='Fail' OR co.nomor_sap='' OR co.nomor_sap='WAITING')
      AND cmo.isactive = 'Y'
      and co.isactive = 'Y'
      AND mdv.m_distributor_id = cmo.m_distributor_id )`;

      console.log(queryUpdate);
      await request.query(queryUpdate);

      let responsesap = [];
      if (datas.length > 0) {
        let xml = fs.readFileSync("soap/REQUEST_SOAP.xml", "utf-8");
        let hasil = await racikXML2(xml, datas, "ITAB");

        let c_order_id = `WEEK-${week}-${periode}`;
        let remotePath =
          "/home/sapftp/esales/soweek/request/" + `${c_order_id}.xml`;

        let sqlgetstatusIntegasi = `SELECT TOP 1 * FROM integration_url ORDER BY created DESC`;
        let datastatusIntegasi = await request.query(sqlgetstatusIntegasi);
        let statusIntegasi =
          datastatusIntegasi.recordset.length > 0
            ? datastatusIntegasi.recordset[0].status
            : "DEV";

        if (statusIntegasi == "DEV") {
          remotePath = "/home/sapftp/esales/dev/so/" + `${c_order_id}.xml`;
        }

        let dst = dokumentPath("SOWEEK", "request") + "/" + `${c_order_id}.xml`;
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

        let updateso = `update c_order set nomor_sap = 'WAITING' where c_order_id = '${c_order_id}'`;
        await request.query(updateso);
        return res.success({
          result: rows,
          message: responsesap,
        });
      } else {
        return res.error({
          message: "Week CMO Tidak ditemukan",
        });
      }
    } catch (err) {
      return res.error(err);
    }
  },

  regenerateCmoToSap: async function (req, res) {
    await DB.poolConnect;
    const { cmo_id } = req.body;
    try {
      const request = DB.pool.request();

      let queryDataTable = `select x.*,kode_aktif from
          (
          SELECT 
          cmo.nomor_cmo,
          cmo.nomor_po,
          cmo.bulan,
          cmo.tahun,
          mp.item_kategori,
          '00' as spart,
          mpj.kode_channel as distribution_channel,
          rop.kode as sold_to_party,
          ro.kode as ship_to_party,
          convert(varchar,DATEADD(m, DATEDIFF(m, 0,co.schedule_date), 0), 112) as validfrom,
          convert(varchar,DATEADD(s,-1,DATEADD(mm, DATEDIFF(m,0,co.schedule_date)+1,0)), 112) as validto,
          mp.kode_sap as sku_number,
          mp.kode as sku_customer,
          cod.qty,
          mp.satuan,
          convert(varchar, co.schedule_date, 112) as delivery_date,
          cod.stok_awal as stok_awal_cycle,
          cod.doi as doi_distributor,
          cod.estimasi_sales_bulan_depan,
          cod.estimasi_sales_duabulan_kedepan,
          ro.nama,
          co.week_number
          FROM c_order co
          LEFT JOIN cmo cmo ON(cmo.cmo_id = co.cmo_id)
          LEFT JOIN c_orderdetail cod ON(cod.c_order_id = co.c_order_id AND cod.isactive='Y')
          LEFT JOIN m_produk mp ON(mp.m_produk_id = cod.m_produk_id)
          LEFT JOIN m_distributor md ON(md.m_distributor_id = cmo.m_distributor_id)
          LEFT JOIN r_distribution_channel rdc ON(rdc.r_distribution_channel_id = md.r_distribution_channel_id)
          LEFT JOIN r_organisasi ro ON(ro.r_organisasi_id = md.r_organisasi_id)
          LEFT JOIN m_pajak mpj ON(mpj.m_pajak_id = md.m_pajak_id)
          LEFT JOIN r_organisasi rop ON(rop.r_organisasi_id = mpj.r_organisasi_id)
          WHERE co.cmo_id='${cmo_id}' and cod.qty > 0 and cmo.no_sap ='WAITING'
          )x left join 
          m_produk_replacement y on x.sku_number = y.kode_non_aktif`;

      let datacmo = await request.query(queryDataTable);
      let rows = datacmo.recordset;

      let datas = [];
      for (let i = 0; i < rows.length; i++) {
        datas.push({
          MANDT: "",
          BSTKD: rows[i].nomor_cmo,
          BNAME: rows[i].nomor_po,
          AUART: rows[i].item_kategori,
          VTWEG: rows[i].distribution_channel,
          SPART: rows[i].spart,
          KUNNR: rows[i].sold_to_party,
          KUNSH: rows[i].ship_to_party,
          GUEBG: rows[i].validfrom,
          GUEEN: rows[i].validto,
          MATNR: rows[i].sku_number,
          SKU: rows[i].sku_customer,
          WMENG: rows[i].qty,
          VRKME: rows[i].satuan,
          EDATU: rows[i].delivery_date,
          STOKA: rows[i].stok_awal_cycle,
          DOI: rows[i].doi_distributor,
          M1: "",
          M2: "",
          VBELN: "",
          SMATN: rows[i].kode_aktif,
          WEEK1: rows[i].week_number,
        });
      }

      if (datas.length > 0) {
        let xml = fs.readFileSync("soap/REQUEST_SOAP.xml", "utf-8"); // saya duplicate file 'ZFM_WS_CMO.xml' ya, dan pake yg baru saya buat itu sebagai template
        let hasil = racikXML2(xml, datas, "ITAB");

        lemparFTP(hasil, cmo_id);

        return res.success({
          result: rows,
          message: "lempar berhasil",
        });
      } else {
        return res.success({
          result: rows,
          message: "No SAP sudah ada",
        });
      }
    } catch (err) {
      return res.error(err);
    }
  },
  regenerateCmoToSapMultiple: async function (req, res) {
    await DB.poolConnect;
    const { tahun, bulan } = req.body;
    try {
      const request = DB.pool.request();

      let getCmoId = `SELECT * FROM cmo c WHERE tahun=${tahun} AND bulan = ${bulan} AND isactive = 'Y' AND no_sap = 'WAITING'`;
      console.log(getCmoId);
      let listcmo = await request.query(getCmoId);
      let cmolist = listcmo.recordset;

      for (let i = 0; i < cmolist.length; i++) {
        let cmo_id = cmolist[i].cmo_id;

        let queryDataTable = `select x.*,kode_aktif from
            (
            SELECT 
            cmo.nomor_cmo,
            cmo.nomor_po,
            cmo.bulan,
            cmo.tahun,
            mp.item_kategori,
            '00' as spart,
            mpj.kode_channel as distribution_channel,
            rop.kode as sold_to_party,
            ro.kode as ship_to_party,
            convert(varchar,DATEADD(m, DATEDIFF(m, 0,co.schedule_date), 0), 112) as validfrom,
            convert(varchar,DATEADD(s,-1,DATEADD(mm, DATEDIFF(m,0,co.schedule_date)+1,0)), 112) as validto,
            mp.kode_sap as sku_number,
            mp.kode as sku_customer,
            cod.qty,
            mp.satuan,
            convert(varchar, co.schedule_date, 112) as delivery_date,
            cod.stok_awal as stok_awal_cycle,
            cod.doi as doi_distributor,
            cod.estimasi_sales_bulan_depan,
            cod.estimasi_sales_duabulan_kedepan,
            ro.nama,
            co.week_number
            FROM c_order co
            LEFT JOIN cmo cmo ON(cmo.cmo_id = co.cmo_id)
            LEFT JOIN c_orderdetail cod ON(cod.c_order_id = co.c_order_id AND cod.isactive='Y')
            LEFT JOIN m_produk mp ON(mp.m_produk_id = cod.m_produk_id)
            LEFT JOIN m_distributor md ON(md.m_distributor_id = cmo.m_distributor_id)
            LEFT JOIN r_distribution_channel rdc ON(rdc.r_distribution_channel_id = md.r_distribution_channel_id)
            LEFT JOIN r_organisasi ro ON(ro.r_organisasi_id = md.r_organisasi_id)
            LEFT JOIN m_pajak mpj ON(mpj.m_pajak_id = md.m_pajak_id)
            LEFT JOIN r_organisasi rop ON(rop.r_organisasi_id = mpj.r_organisasi_id)
            WHERE co.cmo_id='${cmo_id}' and cod.qty > 0 and cmo.no_sap ='WAITING'
            )x left join 
            m_produk_replacement y on x.sku_number = y.kode_non_aktif`;

        let datacmo = await request.query(queryDataTable);
        let rows = datacmo.recordset;

        let datas = [];
        for (let i = 0; i < rows.length; i++) {
          datas.push({
            MANDT: "",
            BSTKD: rows[i].nomor_cmo,
            BNAME: rows[i].nomor_po,
            AUART: rows[i].item_kategori,
            VTWEG: rows[i].distribution_channel,
            SPART: rows[i].spart,
            KUNNR: rows[i].sold_to_party,
            KUNSH: rows[i].ship_to_party,
            GUEBG: rows[i].validfrom,
            GUEEN: rows[i].validto,
            MATNR: rows[i].sku_number,
            SKU: rows[i].sku_customer,
            WMENG: rows[i].qty,
            VRKME: rows[i].satuan,
            EDATU: rows[i].delivery_date,
            STOKA: rows[i].stok_awal_cycle,
            DOI: rows[i].doi_distributor,
            M1: "",
            M2: "",
            VBELN: "",
            SMATN: rows[i].kode_aktif,
            WEEK1: rows[i].week_number,
          });
        }

        if (datas.length > 0) {
          let xml = fs.readFileSync("soap/REQUEST_SOAP.xml", "utf-8"); // saya duplicate file 'ZFM_WS_CMO.xml' ya, dan pake yg baru saya buat itu sebagai template
          let hasil = racikXML2(xml, datas, "ITAB");

          lemparLocal(hasil, cmo_id);

          console.log("Lempar behasil " + i);
        } else {
          console.log("Lempar Gagal " + i);
        }
      }

      return res.success({
        message: "Selesai bentuk ulang",
      });
    } catch (err) {
      return res.error(err);
    }
  },

  regenerateWeekTransaction: async function (req, res) {
    await DB.poolConnect;
    const { tahun, bulan,week_number } = req.body;
    try {
      const request = DB.pool.request();

      let queryDataTable = `SELECT DISTINCT * FROM cmo c WHERE c.cmo_id IN(
        '6736d449-f4b6-40e2-9d43-935b80ecd1d4',
        '99100c45-3419-4b35-9966-6e4fb784ae2c',
        'fad49a4b-eb63-431e-8439-b10e3955f0a3',
        'b2f92ffc-68a9-435a-8644-5c7267c0d119',
        'ecce70e7-d71f-4809-815c-1720a7661d5e',
        '22535e09-b15e-468c-897a-510508026d8b',
        '389ede79-80b2-46dc-aacc-be0e53c76b82',
        '169a6943-0a17-48e1-98ab-3d4a4a71a102',
        'a4a62e3c-f4ac-40cd-a3e7-b87d8769f163',
        '60a608ec-7e87-417c-a465-2550bc8ce057',
        '47d6c683-6a21-4ee6-af06-80dc9bf1c4ec',
        'ddff76f6-7d6e-4a75-abd9-ea9352479bf0',
        'a1b31030-b669-4dfd-8c63-07841904d798',
        'fe65e7fe-72ec-4f0e-b588-17f12cf787c5',
        'e232bbbb-86ef-4c23-85a5-c028963f7284',
        'faccf969-054f-4e6c-acb7-fa9147121876',
        'b8b935b3-2ca2-431d-81ec-3ee16786d21c',
        'ebabaa97-e162-4f09-b4c5-ecee19216954',
        'e019e0d6-d230-41a6-815d-7c334b1a6254',
        'dabc04b3-1bff-4d02-a170-931991d1f8da',
        'dcfcb660-5594-42d7-bc7a-b8d942249e54',
        '90795508-7741-497f-ad29-1a3792be8b36',
        '29045863-a6c3-4abb-97ba-9ae6d4d76a4f',
        'b3ef82fe-a319-45c0-98d8-e64828f7b7c0',
        'a47d5394-c1d7-473e-a881-88e1ac07f2b8',
        '3c9e59e9-a303-4c6d-ba57-13c09c8c58bc',
        '5ee4e282-b6b4-4406-9177-8f912af9e596',
        '79252858-2640-4a97-bd29-ec7a4a6a5e9a',
        '58458729-c10c-4a19-8c3b-281f9f6ccf3a',
        'fb8dd3ad-85e0-413c-96ae-47671d0d6e60',
        '73b56863-eecb-4a0b-8cea-ef279422a1bb',
        '16596c55-cfe7-421f-916a-f6c1f7f42a71',
        '5b80f707-b65d-456b-b6ee-22f2d0d89080',
        'e73031fc-be17-4fbb-82c8-6b3a54cca6da'
        )`;

      let datacmo = await request.query(queryDataTable);
      let rows = datacmo.recordset;

      for (let i = 0; i < rows.length; i++) {
        let cmo_id = rows[i].cmo_id;
        // cek week
        let sqlGetCekOrder = `SELECT COUNT(1) AS total_rows FROM c_order WHERE cmo_id = '${cmo_id}' AND week_number = 2`;
        let dataOrder = await request.query(sqlGetCekOrder);
        let orderweek = dataOrder.recordset[0].total_rows;

        if (orderweek == 0) {
          console.log(i);
          console.log(cmo_id);
          let c_order_id = uuid();

          let sqlgetdetailOrder = `
                INSERT INTO c_order
                (c_order_id,cmo_id, week_number, schedule_date, tonase, 
                kubikasi, nomor_sap, nomor_shipment, status, kode_status)
                SELECT TOP 1 '${c_order_id}' as c_order_id,cmo_id,2,'2022-04-12' schedule_date, 
                tonase, kubikasi, 'WAITING' AS nomor_sap, nomor_shipment, status, NULL AS kode_status 
                FROM c_order WHERE cmo_id = '${cmo_id}'`;

          //console.log(sqlgetdetailOrder);

          await request.query(sqlgetdetailOrder);

          // bentuk c_orderdetail

          let sqlBuildOrderDetail = `INSERT INTO c_orderdetail
                (c_order_id, line, cmo_detail_id, m_produk_id, r_uom_id, stok_awal, stok_pending, total_stok, estimasi_sales_bulan_berjalan, stok_akhir, 
                estimasi_sales_bulan_depan, buffer_stok, avarage_sales_tiga_bulan, doi, cmo, qty, harga, total_order, estimasi_sales_duabulan_kedepan, estimasi_sales_bulan_lalu, week_number, harga_nett, total_order_nett)
                SELECT '${c_order_id}' AS c_order_id,line,cmo_detail_id,m_produk_id,
                r_uom_id,stok_awal,stok_pending, total_stok, estimasi_sales_bulan_berjalan, stok_akhir, 
                estimasi_sales_bulan_depan, buffer_stok, 
                avarage_sales_tiga_bulan, doi, cmo, 
                qty_order_2, harga, total_order, estimasi_sales_duabulan_kedepan,
                estimasi_sales_bulan_lalu, 2, harga_nett, total_nett 
                FROM cmo_detail WHERE cmo_id  = '${cmo_id}' and qty_order_2 > 0`;

          await request.query(sqlBuildOrderDetail);

          //console.log(sqlBuildOrderDetail);
        } else {
          console.log("sudah ada");
          console.log(cmo_id);
        }
      }

      return res.success({
        message: "Selesai bentuk ulang",
      });
    } catch (err) {
      return res.error(err);
    }
  },
};

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
  const addTemplate = jsonArray.map((data) => {
    return { item: data };
  });
  const result = builder.buildObject(addTemplate);
  return xmlTemplate.replace("#", result);
}

function racikXMLMingguanObject(xmlTemplate, jsonArray, rootHead) {
  var builder = new xml2js.Builder({ headless: true, rootName: rootHead });

  const result = builder.buildObject(jsonArray);

  return xmlTemplate.replace("?", result);
}

async function lemparFTP(hasil, cmo_id) {
  let remotePath = "/home/sapftp/esales/cmo/monthly/" + `${cmo_id}.xml`;

  await DB.poolConnect;
  const request = DB.pool.request();

  let sqlgetstatusIntegasi = `SELECT TOP 1 * FROM integration_url ORDER BY created DESC`;
  let datastatusIntegasi = await request.query(sqlgetstatusIntegasi);
  let statusIntegasi =
    datastatusIntegasi.recordset.length > 0
      ? datastatusIntegasi.recordset[0].status
      : "DEV";

  if (statusIntegasi == "DEV") {
    // console.log('KEDEP DONG');
    remotePath = "/home/sapftp/esales/dev/cmo/" + `${cmo_id}.xml`;
  }

  let locationFiles = dokumentPath("CMO", "request").replace(/\\/g, "/");
  let dst = dokumentPath("CMO", "request") + "/" + `${cmo_id}.xml`;
  let localPath = dst.replace(/\\/g, "/");
  shell.mkdir("-p", locationFiles);
  console.log(locationFiles + "/" + `${cmo_id}.xml`);
  fs.writeFile(
    locationFiles + "/" + `${cmo_id}.xml`,
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
          console.error(err.message);
        });
    }
  );
}

async function lemparLocal(hasil, cmo_id) {
  let remotePath = "/home/sapftp/esales/cmo/monthly/" + `${cmo_id}.xml`;

  await DB.poolConnect;
  const request = DB.pool.request();

  let sqlgetstatusIntegasi = `SELECT TOP 1 * FROM integration_url ORDER BY created DESC`;
  let datastatusIntegasi = await request.query(sqlgetstatusIntegasi);
  let statusIntegasi =
    datastatusIntegasi.recordset.length > 0
      ? datastatusIntegasi.recordset[0].status
      : "DEV";

  if (statusIntegasi == "DEV") {
    remotePath = "/home/sapftp/esales/dev/cmo/" + `${cmo_id}.xml`;
  }

  let locationFiles = dokumentPath("CMO", "request").replace(/\\/g, "/");
  let dst = dokumentPath("CMO", "request") + "/" + `${cmo_id}.xml`;
  let localPath = dst.replace(/\\/g, "/");
  shell.mkdir("-p", locationFiles);
  console.log(locationFiles + "/" + `${cmo_id}.xml`);
  fs.writeFile(
    locationFiles + "/" + `${cmo_id}.xml`,
    hasil,
    async function (err) {
      if (err) return err;
    }
  );
}
