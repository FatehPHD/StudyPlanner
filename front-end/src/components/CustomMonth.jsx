// CustomMonth.jsx - Month view with fixed 3 events before "+X more" (sorted by time via default)
import Month from 'react-big-calendar/lib/Month'

const MONTH_ROW_LIMIT = 3

/**
 * Custom Month that shows up to 3 events per day before "+X more".
 * Extends the default Month and overrides measureRowLimit to use a fixed value.
 */
class CustomMonth extends Month {
  measureRowLimit() {
    this.setState({
      needLimitMeasure: false,
      rowLimit: MONTH_ROW_LIMIT
    })
  }
}

export default CustomMonth
