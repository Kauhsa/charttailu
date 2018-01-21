const fs = require('fs');
const path = require('path');
const _ = require('lodash');
const glob = require('fast-glob');
const csvWriter = require('csv-write-stream');

const SMParse = require('./parser');
const exportSm = require('./exportSm');

const main = async () => {
  const paths = await glob(process.argv[2] + '**/*.sm');

  const parsedCharts = _.flatMap(paths, smPath => {
    const file = fs.readFileSync(smPath, { encoding: 'utf8' });
    const smFile = SMParse(file, {});
    
    const pack = _.nth(smPath.split(path.sep), -3);

    return exportSm(smFile).map(chart => ({
      pack,
      ...chart
    }))
  })

  var writer = csvWriter();
  writer.pipe(fs.createWriteStream(process.argv[3]));
  parsedCharts.forEach(chart => writer.write(chart));
  writer.end();
}

main();
