const fs = require('fs');
const moment = require('moment');
const puppeteer = require('puppeteer');
const handlebars = require("handlebars");
const path = require('path');
const direktoricetak = () => path.resolve(sails.config.appPath, 'assets', 'report', 'fkr');



module.exports = {

    download: async function(req, res) {
    const {
            query: {fkr_id}
          } = req;
    
        await DB.poolConnect;

    try {
        const request = DB.pool.request();
        const logo = `data:image/jpeg;base64,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`;


        let pathRoot = path.resolve(direktoricetak(),"berita_acara_pengantar_peralihan.html");
        let content = fs.readFileSync(pathRoot,"utf-8");


        let sqlGetDataFKR = `SELECT f.fkr_id,mpv.nama AS soldto,mdv.nama AS asal,mdv2.nama AS tujuan FROM fkr f 
        LEFT JOIN m_distributor_v mdv ON mdv.m_distributor_id = f.m_distributor_id 
        LEFT JOIN m_pajak_v mpv ON mdv.m_pajak_id = mpv.m_pajak_id 
        LEFT JOIN m_distributor_v mdv2 ON mdv2.m_distributor_id = f.tujuan_retur 
        WHERE f.fkr_id = '${fkr_id}'`;
        let getDataFkr = await request.query(sqlGetDataFKR);
        const row = getDataFkr.recordset[0];

        let sqlGetDetailDataFkr = `SELECT ROW_NUMBER() OVER(PARTITION BY mp.kode_sap ORDER BY mp.nama ASC) AS urutan, mp.nama,mp.kode_sap,fd.total_retur,
        CASE WHEN fd.satuan='KAR' THEN 'Carton' ELSE fd.satuan END satuan
        FROM fkr_detail fd 
        LEFT JOIN m_produk mp ON fd.m_produk_id = mp.m_produk_id 
        WHERE fd.fkr_id = '${fkr_id}'`;

        let getDataDetailFkr = await request.query(sqlGetDetailDataFkr);
        const detail = getDataDetailFkr.recordset;


        // AMBIL GT HEAD
        // let sqlGetGtHead = `SELECT TOP 1 nama FROM pejabat_fkr pf WHERE kode = 'GT_HEAD' ORDER BY created DESC`;
        // let getdataGtHead = await request.query(sqlGetGtHead);
        // const gthead = getdataGtHead.recordset[0];


        let sqlGetTanggalBa = `SELECT TOP 1 CONVERT(varchar(10),created,120) AS created FROM fkr_audit_approve WHERE fkr_id = '${fkr_id}' 
        AND kode_status = 'APA' ORDER BY created DESC`;
        let getTanggalBa = await request.query(sqlGetTanggalBa);
        const tanggalBa = getTanggalBa.recordset[0].created;
        

        let detailTable = _generateTable(detail);


        let totalQuantity = 0;
        for (let i = 0; i < detail.length; i++) {
            let total_retur = Number(detail[i].total_retur);
            totalQuantity = totalQuantity + total_retur;
            
        }

        // get approval sales head

        let sqlGetApprovalSalesHead = `SELECT isnull(CONVERT(VARCHAR(10),d.created,120),'-') AS approvedate FROM fkr_role_amount_approve a 
        LEFT JOIN fkr_audit_approve d ON (d.m_role_id = a.m_role_id AND d.fkr_id = '${fkr_id}' AND d.isactive='Y')
        LEFT JOIN m_role e on e.m_role_id = a.m_role_id
		WHERE e.nama = 'SALESHO3'`;

        let getTanggalApprovalSalesHead = await request.query(sqlGetApprovalSalesHead);
        const tanggalApprovalSalesHead = getTanggalApprovalSalesHead.recordset[0].approvedate;


        // console.log(detailTable);

        row.logo = logo;
        row.tanggal = tanggalBa;
        row.detailTable = detailTable;
        row.asalSiganture = row.asal;
        row.tujuanSiganture = row.tujuan;
        row.totalQuantity = totalQuantity;
        row.tanggalApprovalSalesHead = tanggalApprovalSalesHead;
        // row.gthead = gthead.nama;
        



        

        // console.log(row);
        let finalHtml = await sails.helpers.generateHtmlCetakFkr.with({ htmltemplate: 'berita_acara_pengantar_peralihan', templateparam: row}); 


        // console.log(finalHtml);
                           
        const browser = await puppeteer.launch({ headless: true })
        const page = await browser.newPage();
        await page.setContent(finalHtml);

        const buffer = await page.pdf({
        format:'Legal',
        printBackground: true,
        margin: {
            top: "1.5cm",
            right: "1.5cm",
            bottom: "1.5cm",
            left: "1.5cm"
        }});

        // let height = await page.evaluate(() => document.documentElement.offsetHeight);
                
        // const buffer = await page.pdf({
        //     width: `1200px`,
        //     height: `${height+1}px`,
        //     printBackground: true,
        //   })

        await browser.close();
        res.contentType(`application/pdf`);
        res.send(buffer);


        }catch(err){
            return res.error(err);
        }
    }
  
}


function _generateTable(table) {
    if (table.length > 0) {
        const addRowSpan = (column, i, rspan = true, cn = "") => {
            var row = table[i],
                prevRow = table[i - 1],
                td = `<td class="${cn}">${row[column]}</td>`
  
            if (rspan) {
                if (prevRow && row[column] === prevRow[column]) {
                    td = ``
                } else {
                    var rowspan = 1
  
                    for (var j = i; j < table.length - 1; j++) {
                        if (table[j][column] === table[j + 1][column]) {
                            rowspan++
                        } else {
                            break
                        }
                    }
                    td = `<td class="${cn}" rowSpan="${rowspan}">${row[column]}</td>`
                }
            }
  
            return td
        }
  
        let content = ""
        for (let i = 0; i < table.length; i++) {
            content = content + `<tr class="mono-space">`
            content = content + addRowSpan("urutan", i, false,"center")
            content = content + addRowSpan("nama", i, false,"left")
            content = content + addRowSpan("kode_sap", i, false,"left")
            content = content + addRowSpan("satuan", i, false, "left")
            content = content + addRowSpan("total_retur", i, false, "right")
            content = content + `</tr>`
        }
          return content;
    }
    
    return '<tr><td>No Data</td></tr>'
  }