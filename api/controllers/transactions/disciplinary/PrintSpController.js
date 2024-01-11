const fs = require('fs');
const path = require('path');
const moment = require('moment');
const puppeteer = require('puppeteer');
const handlebars = require("handlebars");
const direktoricetak = () => path.resolve(sails.config.appPath, 'assets', 'report', 'sp');
const direktoricetakSuratTeguran = () => path.resolve(sails.config.appPath, 'assets', 'report', 'sp','suratteguran');
module.exports = {

    print: async function(req, res) { 

        await DB.poolConnect;
        try {
            
            const request = DB.pool.request();
            let queryDataTable = `SELECT * FROM sp WHERE sp_id='${req.param(
                "id"
              )}'`;
        
              request.query(queryDataTable,async (err, result) => {
                if (err) {
                  return res.error(err);
                }
        

                const row = result.recordset[0];
                let pathRoot = row.warning_level == '4' ? path.resolve(direktoricetakSuratTeguran(),"index.hbs") : path.resolve(direktoricetak(),"index.hbs");

                let content = fs.readFileSync(pathRoot,"utf-8");      
                row.baseurl = direktoricetak();
                row.judul = row.warning_level == '1' ? 'SURAT PERINGATAN I' : row.warning_level == '2' ? 'SURAT PERINGATAN II' : row.warning_level == '3' ?  'SURAT PERINGATAN III' : 'SURAT PERINGATAN TEGURAN LISAN' ;
                row.perihal = row.warning_level == '1' ? 'SURAT PERINGATAN PERTAMA' : row.warning_level == '2' ? 'SURAT PERINGATAN KEDUA' : row.warning_level == '3' ? 'SURAT PERINGATAN KETIGA' : 'SURAT PERINGATAN TEGURAN LISAN';
                row.company = row.issue_company_id == 'HI' ? 'PT. Herlina Indah' : row.issue_company_id == 'MI' ? 'PT. Marketama Indah' : row.issue_company_id == 'DRI' ? 'Dunia Rasa Indah' : 'PT Sari Enesis Indah';
                moment.locale('id')
                row.hari_sp = moment(row.date_issue,'YYYY-MM-DD').format('dddd');
                row.tanggal_sp = moment(row.date_issue,'YYYY-MM-DD').format('DD MMMM YYYY');
                row.warning_level_description = row.warning_level == '1' ? 'ringan' : 'berat';
                row.jumlah_bulan_expired = row.warning_level == '1' ? 6 : row.warning_level == '2' ? 6 : row.warning_level == '3' ?  6 : 3  ;
                row.letter_no = row.kode_status == 'STO' ? row.letter_no : '-';
                //console.log(row.tanggal_sp);
                
                let template = handlebars.compile(content);
                let finalHtml = template(row); 
                                   
                const browser = await puppeteer.launch({ headless: true })
                const page = await browser.newPage();
                await page.setContent(finalHtml);
                let cssFile=path.join(direktoricetak(),`index.css`);
                await page.addStyleTag({path: cssFile});
      
                const buffer = await page.pdf({format:'A4'})
                        
                await browser.close();
                res.contentType(`application/pdf`);
                res.send(buffer);

                
              });
        } catch (err) {
          return res.error(err);
        }
    
    }
    
}



function racikXML(xmlTemplate, param) {

  return xmlTemplate.replace('?', param);

}