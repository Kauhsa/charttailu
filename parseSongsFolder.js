const fs = require('fs');
const path = require('path');
const _ = require('lodash');
const csvWriter = require('csv-write-stream');
const klawSync = require('klaw-sync')

const SMParse = require('./parser');
const exportSm = require('./exportSm');

const main = async () => {
  const directory = process.argv[2]
  console.log('Finding charts from directory:', directory)

  const paths = klawSync(directory, { nodir: true })
    .map(({ path }) => path)
    .filter(path => path.toLowerCase().endsWith('.sm'))

  console.log(`Found ${paths.length} files`)

  const parsedCharts = _.flatMap(paths, smPath => {
    try {
      const file = fs.readFileSync(smPath, { encoding: 'utf8' });
      const smFile = SMParse(file, {});
      const pack = _.nth(smPath.split('/'), -3);
    
      return exportSm(smFile).map(chart => ({
        path: smPath,
        pack,
        ...chart
      }))
    } catch (e) {
      console.error("Couldn't parse ", smPath);
      console.error(e);
      console.error('Continuing anyway...');
      return [];
    }
  })

  const csvPath = process.argv[3]; 
  console.log('Writing to', csvPath)

  var writer = csvWriter();
  writer.pipe(fs.createWriteStream(csvPath));
  parsedCharts.forEach(chart => writer.write(chart));
  writer.end();
}

main().catch(err => console.error(err));
