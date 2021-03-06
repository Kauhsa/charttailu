const _ = require('lodash');

const doesRowHaveStep = row => row.includes("1") || row.includes("2") || row.includes("4")

const isEmptyRow = row => _.every(row, note => note === "0")

const stepCount = (notes) => {
  return notes
    .map(([measureNumber, rows]) => {
      return rows.filter(doesRowHaveStep).length
    })
    .reduce((a, b) => a + b, 0)
}

const isStreamMeasure = (rows, minStream) => {
  if (rows.filter(doesRowHaveStep).length < minStream) {
    return false;
  }

  let rowWithLastNote = 0;
  let noteGapThreshold = rows.length / minStream;


  for (let i = 0; i < rows.length; i++) {
    if (doesRowHaveStep(rows[i])) {
      if (i - rowWithLastNote > noteGapThreshold) {
        return false;
      } else {
        rowWithLastNote = i;
      }
    }
  }

  return true;
}

const getSongLength = (bpmChanges, stops, notes) => {
  const rowsWithTime = _.flatMap(notes, ([measureNumber, rows]) => {
    return _.flatMap(rows, (row, i) => {
      if (isEmptyRow(row)) {
        return []
      }

      const beat = (measureNumber * 4) + (i / rows.length * 4)

      return [
        beatToSeconds(bpmChanges, stops, beat)
      ]
    })
  })

  return _.last(rowsWithTime) - _.first(rowsWithTime);
}

const beatToSeconds = (bpmChanges, stops, beat) => {
  const bpmWindows = _.zip(bpmChanges, _.tail(bpmChanges))
  let length = 0;

  bpmWindows.forEach(([first, second]) => {
    const firstBeat = parseFloat(first[0])
    const secondBeat = second ? parseFloat(second[0]) : Infinity
    const firstBpm = parseFloat(first[1])
    const maxBeats = secondBeat - firstBeat
    const beatsOnRange = Math.max(Math.min((beat - firstBeat), maxBeats), 0)
    length += (beatsOnRange / firstBpm) * 60
  })

  if (stops) {
    stops.forEach(([stopBeat, stopSeconds]) => {
      if (parseFloat(stopBeat) < parseFloat(beat)) {
        length += parseFloat(stopSeconds);
      }
    })
  }
  
  return length;
}

const streamMeasures = (notes, minStream) => {
  return notes
    .map(([measureNumber, rows]) => {
      return isStreamMeasure(rows, minStream) ? 1 : 0;
    })
    .reduce((a, b) => a + b, 0)
}

const breakdown = (notes, minStream) => {
  const breakdownItems = notes
    .reduce((breakdown, [measureNumber, rows]) => {
      const isStream = isStreamMeasure(rows, minStream)
      const last = _.last(breakdown)

      if (!last || last.isStream !== isStream) {
        return [...breakdown, { count: 1, isStream }]
      } else {
        const allButLast = _.initial(breakdown)
        return [...allButLast, { count: last.count + 1, isStream: last.isStream }]
      }
    }, [])
    // filter breaks of one measure out
    .filter(({ isStream, count }) => isStream || count > 1)

  // filter out breaks from start and end
  const noBreak = item => !item.isStream
  const breaksStripped = _.dropRightWhile(_.dropWhile(breakdownItems, noBreak), noBreak)

  return breaksStripped
    .map(({ isStream, count }) => isStream ? '' + count : `(${count})`)
    .join(' ')
}

const parseFile = (smFile) => {
  return smFile.charts
    .filter(chart => chart.type === 'dance-single')
    .map(chart => ({
      title: smFile.meta.title,
      subtitle: smFile.meta.subtitle,
      artist: smFile.meta.artist,
      rating: chart.meter,
      minBpm: smFile.changes.bpm.reduce((a, b) => Math.min(a, parseFloat(b[1])), +Infinity),
      maxBpm: smFile.changes.bpm.reduce((a, b) => Math.max(a, parseFloat(b[1])), -Infinity),
      minDisplayBpm: smFile.meta.minDisplayBpm,
      maxDisplayBpm: smFile.meta.maxDisplayBpm,
      diff: chart.diff,
      length: getSongLength(smFile.changes.bpm, smFile.changes.stop, chart.notes),
      steps: stepCount(chart.notes),
      streamMeasures16th: streamMeasures(chart.notes, 16),
      streamMeasures8th: streamMeasures(chart.notes, 8),
      breakdown: breakdown(chart.notes, 16)
    }))
}

module.exports = parseFile

