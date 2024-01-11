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
const puppeteer = require("puppeteer");
const DBEMPLOYEE = require("./../../../services/DBEMPLOYEE");

const Base64 = require("base-64");

module.exports = {
  printDocumentPdf: async function (req, res) {
    const { settlementVaPaymentProposalId } = req.body;
    await DB.poolConnect;

    try {
      const request = DB.pool.request();
      console.log("connect..");

      // ambil data nama
      const sqlGetNamaAssigment = `SELECT nama_assigment , nip_assigment, company_code, total_amount, description, createdby, fiscal_year,
      CASE WHEN company_code = '1100' THEN 'PT. HERLINA INDAH' WHEN company_code = '2100' THEN 'PT. MARKETAMA INDAH' ELSE 'PT. SARI ENESIS INDAH'
      END AS company_desc,
      MONTH(created) AS bulan,YEAR(created) AS tahun
      FROM settlement_va_payment_proposal svpp WHERE settlement_va_payment_proposal_id = '${settlementVaPaymentProposalId}'`;
      console.log(sqlGetNamaAssigment);
      const sqlGetData = await request.query(sqlGetNamaAssigment);
      const dataGet = sqlGetData.recordset[0];
      // console.log(dataGet, "datagetId");

      const nama_assigment = dataGet.nama_assigment;
      const nip_assigment = dataGet.nip_assigment;
      const tahun = dataGet.tahun; // untuk isi period tahun
      const bulan = getBulan(dataGet.bulan); // untuk isi period bulan
      const total_amount = dataGet.total_amount; // untuk isi di col total
      const createdbyNip = dataGet.createdby; // untuk isi nama yang dibuat oleh
      const description = dataGet.description; // untuk isi dari col rincian
      const company_desc = dataGet.company_desc; // untuk isi dari company description
      // console.log(nama_assigment, "nama & ", nip_assigment, "nip");

      // ambil data nip yang ditaruh sql bawah untuk mendapatkan departemen/orh_desc

      // mencari dan ambil data org_desc
      let queryDataTable = `select display_name,internal_title,org_desc from v_headcount vh where employee_id = '${nip_assigment}'  `;
      let getdata = await DBEMPLOYEE.query(queryDataTable);
      let data = getdata.rows[0];

      const org_desc = data.org_desc;
      const display_name = data.display_name;
      // console.log(org_desc, "orgdesc");

      //   ambil data detail dari nomor advanced
      const sqlGetDataDetail = `SELECT nomor_advance from detail_settlement_va_payment_proposal dsvpp WHERE settlement_va_payment_proposal_id = '${settlementVaPaymentProposalId}'`;
      // console.log(sqlGetDataDetail);
      const sqlGet = await request.query(sqlGetDataDetail);
      const dataGetDetail = sqlGet.recordset;
      // console.log(dataGetDetail, "dataGetDetail");
      const nomorAdvanceList = dataGetDetail.map((item) => item.nomor_advance);
      // this.documentAdvance.push(nomorAdvanceList);

      const sqlGett = `SELECT nama, nik, jabatan, urutan, createdby FROM settlement_approval sa WHERE settlement_id = '${settlementVaPaymentProposalId}' ORDER BY urutan`;
      const sqlGetAw = await request.query(sqlGett);
      const dataGett = sqlGetAw.recordset;
      const namaApprove = dataGett.map((item) => item.nama);

      // contoh data array
      // const dataarray = [
      //   { nama: "approve 1" },
      //   { nama: "aprove 2" },
      //   { nama: "approve 3" },
      // ];

      //  rubah format total amount
      const formattedTotalAmount = total_amount.toLocaleString();
      // ==============================
      // kode untuk generate html-pdf |
      // ==============================
      // /home/syifa_tazfa/Documents/project/API/enesis/enesis_project/apiesales/printVaPembayaranEprop.html

      const templatePath = path.resolve(
        __dirname,
        "../../../../printVaPembayaranEprop.html"
      );

      const browser = await puppeteer.launch();
      const page = await browser.newPage();

      const fileContent = fs.readFileSync(templatePath, "utf8");
      console.log(1);

      const populatedContent = fileContent
        .replace("{nama_assigment}", nama_assigment || "-")
        .replace("{org_desc}", org_desc || "-")
        .replace("{tahun}", tahun || "-")
        .replace("{bulan}", bulan || "-")
        .replace("{nomorAdvanceList}", nomorAdvanceList || "-")
        .replace("{description}", description || "-")
        .replace("{total_amount}", "Rp. " + formattedTotalAmount || "-")
        .replace("{total_all}", "Rp. " + formattedTotalAmount || "-")
        .replace("{display_name}", display_name)
        .replace("{company_desc}", company_desc)
        .replace(
          "{data_approve}",
          namaApprove.map((e) => {
            return `<div style="text-align: center; flex: 1; padding: 0px 5px;">
          <p style="margin-bottom: 90px">Disetujui Oleh</p>
          <div
            style="display: flex; align-items: center; justify-content: center; min-height: 20px;"
          >
            <div>(</div>
            <div style="padding: 0px 5px">${e}</div>
            <div>)</div>
          </div>
        </div>`;
          })
        )
        .replace(
          "{imagePath}",
          `data:image/jpeg;base64,${fs
            .readFileSync(
              path.resolve(__dirname, "../../../../assets/images/logo.jpg")
            )
            .toString("base64")}`
        );
      await page.setContent(populatedContent, {
        waitUntil: "domcontentloaded",
      });
      console.log(2);
      const pdfBuffer = await page.pdf({ format: "A4" });

      await browser.close();

      const fileName = "settlementVa_pembayaran_eprop.pdf";
      res.set("Content-Disposition", `attachment; filename="${fileName}"`);
      res.set("Content-Type", "application/pdf");
      console.log(namaApprove);
      res.send(pdfBuffer);
      // return res.send({
      //   status: "Success",
      //   data_no_advance: nomorAdvanceList,
      //   data_header: dataGet,
      //   data_approve: dataGett,
      // });
    } catch (err) {
      return res.error(err);
    }
  },
  
};


function getBulan(bulan){

  let hasil = ``;
  if(bulan == 1){
    hasil = 'Januari';
  }else if(bulan == 2){
    hasil = 'Februari';
  }else if(bulan == 3){
    hasil = 'Maret';
  }else if(bulan == 4){
    hasil = 'April';
  }else if(bulan == 5){
    hasil = 'Mei';
  }else if(bulan == 6){
    hasil = 'Juni';
  }else if(bulan == 7){
    hasil = 'Juli';
  }else if(bulan == 8){
    hasil = 'Agustus';
  }else if(bulan == 9){
    hasil = 'September';
  }else if(bulan == 10){
    hasil = 'Oktober';
  }else if(bulan == 11){
    hasil = 'November';
  }else if(bulan == 12){
    hasil = 'Desember';
  }

  return hasil;
}
