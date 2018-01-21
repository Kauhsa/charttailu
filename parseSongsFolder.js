const fs = require('fs');
const path = require('path');
const _ = require('lodash');
const glob = require('glob');
const csvWriter = require('csv-write-stream');

const SMParse = require('./parser');
const exportSm = require('./exportSm');

const main = async () => {
  const globbing = process.argv[2] + '**' + path.sep + '*.sm'
  console.log('Globbing path:', globbing)

  const paths = glob.sync(process.argv[2] + '**' + path.sep + '*.sm');
  console.log(`Found ${paths.length} files`)

  const parsedCharts = _.flatMap(paths, smPath => {
    const file = fs.readFileSync(smPath, { encoding: 'utf8' });
    const smFile = SMParse(file, {});
    
    const pack = _.nth(smPath.split('/'), -3);

    return exportSm(smFile).map(chart => ({
      pack,
      ...chart
    }))
  })

  const csvPath = process.argv[3]; 
  console.log('Writing to', csvPath)

  var writer = csvWriter();
  writer.pipe(fs.createWriteStream(csvPath));
  parsedCharts.forEach(chart => writer.write(chart));
  writer.end();
}

main().catch(err => console.error(err));
