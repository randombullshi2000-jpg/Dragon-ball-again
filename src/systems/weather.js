/**
 * Weather & Time-of-Day System
 */

class WeatherSystem {
  constructor() {
    // In-game time: seconds since midnight
    this.gameTime   = 7 * 3600;  // start at 7 AM
    this.day        = 1;
    this.season     = 'spring';  // spring | summer | autumn | winter

    // Weather
    this.weather    = 'clear';   // clear | cloudy | rain | storm | snow | fog
    this._weatherTimer = 0;
    this._nextChange   = 120;    // seconds until weather may change

    // Wind
    this.windSpeed  = 0;         // 0-3
    this.windDir    = 1;         // -1 left | 1 right

    // Active particles (rain drops etc.) managed externally
    this.rainIntensity  = 0;     // 0-300
    this.snowIntensity  = 0;

    // Training bonuses for weather
    this._bonuses = {
      rain:  { technique: 1.30, speed: 1.20, strength: 1.10 },
      storm: { technique: 1.50, kiControl: 1.40 },
      snow:  { kiControl: 1.60, endurance: 1.10 },
    };
  }

  update(dt) {
    // Advance game time (60 in-game secs per real sec)
    this.gameTime += C.TIME.SPEED * dt;
    if (this.gameTime >= C.TIME.DAY_LENGTH) {
      this.gameTime -= C.TIME.DAY_LENGTH;
      this.day++;
      this._advanceSeason();
    }

    // Weather transitions
    this._weatherTimer += dt;
    if (this._weatherTimer >= this._nextChange) {
      this._weatherTimer = 0;
      this._nextChange   = 60 + Math.random() * 180;
      this._updateWeather();
    }

    // Update intensities
    const target = this.weather === 'rain'  ? 150 :
                   this.weather === 'storm' ? 280 : 0;
    this.rainIntensity = MathUtil.approach(this.rainIntensity, target, 80 * dt);

    const snowTarget = this.weather === 'snow' ? 80 : 0;
    this.snowIntensity = MathUtil.approach(this.snowIntensity, snowTarget, 40 * dt);
  }

  _updateWeather() {
    const season = this.season;
    const rand   = Math.random();

    // Season-dependent probabilities
    const table = {
      spring: [['clear',0.45],['cloudy',0.25],['rain',0.25],['fog',0.05]],
      summer: [['clear',0.55],['cloudy',0.20],['rain',0.15],['storm',0.10]],
      autumn: [['clear',0.35],['cloudy',0.30],['rain',0.25],['fog',0.10]],
      winter: [['clear',0.30],['cloudy',0.25],['snow',0.35],['fog',0.10]],
    };

    let acc = 0;
    for (const [w, p] of (table[season] || table.spring)) {
      acc += p;
      if (rand < acc) { this.weather = w; break; }
    }

    this.windSpeed = Math.random() < 0.3 ? Math.floor(Math.random() * 3) + 1 : 0;
    this.windDir   = Math.random() < 0.5 ? -1 : 1;
  }

  _advanceSeason() {
    const seasons = ['spring','summer','autumn','winter'];
    // Season changes every ~30 days
    if (this.day % 30 === 0) {
      const idx = seasons.indexOf(this.season);
      this.season = seasons[(idx + 1) % 4];
    }
  }

  // Time-of-day fraction 0-1
  get timePct()  { return this.gameTime / C.TIME.DAY_LENGTH; }
  get isDay()    { return this.gameTime >= C.TIME.MORNING && this.gameTime < C.TIME.EVENING; }
  get isNight()  { return this.gameTime >= C.TIME.NIGHT || this.gameTime < C.TIME.DAWN; }
  get isDawn()   { return this.gameTime >= C.TIME.DAWN && this.gameTime < C.TIME.MORNING; }
  get isDusk()   { return this.gameTime >= C.TIME.EVENING && this.gameTime < C.TIME.NIGHT; }

  getSkyColor()      { return ColorUtil.skyColor(this.timePct); }
  getAmbientLight()  {
    if (this.isNight) return 0.35;
    if (this.isDawn || this.isDusk) return 0.70;
    if (this.weather === 'storm') return 0.45;
    if (this.weather === 'cloudy') return 0.80;
    return 1.0;
  }

  // Training multiplier for current weather & time
  getTrainingMult(stat) {
    let mult = 1.0;
    const wb = this._bonuses[this.weather];
    if (wb && wb[stat]) mult *= wb[stat];

    // Time-of-day bonuses
    if (this.isDawn) mult *= 1.10;               // dawn = -20% stamina cost, +10% gains
    if (this.gameTime >= 11*3600 && this.gameTime < 14*3600) mult *= 1.15; // noon
    if (this.isNight) mult *= 1.40;               // night = +40% all
    return mult;
  }

  getTimeLabel() {
    const h   = Math.floor(this.gameTime / 3600) % 24;
    const m   = Math.floor((this.gameTime % 3600) / 60);
    const ampm = h < 12 ? 'AM' : 'PM';
    const h12  = h % 12 || 12;
    return `${h12}:${m.toString().padStart(2,'0')} ${ampm}`;
  }

  getWeatherIcon() {
    return { clear:'☀️', cloudy:'☁️', rain:'🌧️', storm:'⛈️', snow:'❄️', fog:'🌫️' }[this.weather] || '?';
  }

  serialize()   { return { gameTime:this.gameTime, day:this.day, season:this.season, weather:this.weather }; }
  deserialize(d){ Object.assign(this, d); }
}
