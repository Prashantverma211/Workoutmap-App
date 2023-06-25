'use strict';

const form = document.querySelector('.form');
const containerWorkouts = document.querySelector('.workouts');
const inputType = document.querySelector('.form__input--type');
const inputDistance = document.querySelector('.form__input--distance');
const inputDuration = document.querySelector('.form__input--duration');
const inputCadence = document.querySelector('.form__input--cadence');
const inputElevation = document.querySelector('.form__input--elevation');

//using geolocation api:

//refactoring:
class App {
  #map;
  #mapEvent;
  #mapZoom = 13;
  #workouts = [];
  constructor() {
    //get user position:
    this._getPosition();
    //get data from local storage:
    this._getLocalStorage();
    //listen for the submitted from:
    form.addEventListener('submit', this._newWorkOut.bind(this));
    //listen for the change in type field in the form:
    inputType.addEventListener('change', this._toggleElevationField);
    //listen to the click event on the form to go to that point in the map:
    containerWorkouts.addEventListener('click', this._moveToWorkout.bind(this));
  }

  _getPosition() {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        this._showMap.bind(this),
        function () {
          alert(`Please give access to your Location!`);
        }
      );
    }
  }
  _showMap(pos) {
    const { longitude } = pos.coords;
    const { latitude } = pos.coords;
    const coord = [latitude, longitude];
    this.#map = L.map('map').setView(coord, this.#mapZoom);

    L.tileLayer('https://{s}.tile.openstreetmap.fr/hot/{z}/{x}/{y}.png', {
      attribution:
        '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    }).addTo(this.#map);

    //show form:
    this.#map.on('click', this._showForm.bind(this));
    //show markers if local storage has it:
    this.#workouts.forEach(work => this._renderPopupContent(work));
  }

  _showForm(mapEvnt) {
    this.#mapEvent = mapEvnt;
    //making form appear on click on map:
    form.classList.remove('hidden');
    inputDistance.focus();
  }
  _toggleElevationField() {
    inputCadence.closest('.form__row').classList.toggle('form__row--hidden');
    inputElevation.closest('.form__row').classList.toggle('form__row--hidden');
  }
  _newWorkOut(e) {
    e.preventDefault();
    const type = inputType.value;
    const distance = +inputDistance.value;
    const duration = +inputDuration.value;
    const { lat, lng } = this.#mapEvent.latlng;
    let workout;
    //guard function for negative number and not a number input:
    const nanCheck = (...inputs) => inputs.every(inp => Number.isFinite(inp));
    const negativeCheck = (...inputs) => inputs.every(inp => inp > 0);

    //if running make a running object;
    if (type === 'running') {
      const cadence = +inputCadence.value;
      if (
        !nanCheck(distance, duration, cadence) ||
        !negativeCheck(distance, duration, cadence)
      ) {
        return alert(`Please enter a valid number as input`);
      }
      workout = new running([lat, lng], distance, duration, cadence);
    }

    //if cycling make a cycling object;
    if (type === 'cycling') {
      const elevation = +inputElevation.value;
      if (
        !nanCheck(distance, duration, elevation) ||
        !negativeCheck(distance, duration)
      ) {
        return alert(`Please enter a valid number as input`);
      }
      workout = new cycling([lat, lng], distance, duration, elevation);
    }
    this.#workouts.push(workout);

    //show the added form element:
    this._renderSubmittedForm(workout);
    //hide and empty the form on submission
    this._hideform();
    //show marker for the form submitted:
    this._renderPopupContent(workout);
    //set local storage with the submitted form:
    this._setLocalStorage();
  }
  _hideform() {
    //empty form
    inputCadence.value =
      inputDistance.value =
      inputDuration.value =
      inputElevation.value =
        '';
    form.style.display = 'none';
    form.classList.add('hidden');
    //after 1 second let the display agin be grid as animation is finished:
    setTimeout(() => (form.style.display = 'grid'), 1000);
  }
  _renderSubmittedForm(workout) {
    let html = `<li class="workout workout--${workout.type}" data-id="${
      workout.id
    }">
    <h2 class="workout__title">${workout.discription}</h2>
    <div class="workout__details">
      <span class="workout__icon">${
        workout.type === 'running' ? '🏃‍♂️' : '🚴‍♀️'
      }</span>
      <span class="workout__value">${workout.distance}</span>
      <span class="workout__unit">km</span>
    </div>
    <div class="workout__details">
      <span class="workout__icon">⏱</span>
      <span class="workout__value">${workout.duration}</span>
      <span class="workout__unit">min</span>
    </div>
    `;
    if (workout.type === 'running') {
      html += `<div class="workout__details">
            <span class="workout__icon">⚡️</span>
            <span class="workout__value">${workout.pace.toFixed(1)}</span>
            <span class="workout__unit">min/km</span>
          </div>
          <div class="workout__details">
            <span class="workout__icon">🦶🏼</span>
            <span class="workout__value">${workout.cadence}</span>
            <span class="workout__unit">spm</span>
          </div>
        </li>`;
    }
    if (workout.type === 'cycling') {
      html += `<div class="workout__details">
      <span class="workout__icon">⚡️</span>
      <span class="workout__value">${workout.speed.toFixed(1)}</span>
      <span class="workout__unit">km/h</span>
    </div>
    <div class="workout__details">
      <span class="workout__icon">⛰</span>
      <span class="workout__value">${workout.elevation}</span>
      <span class="workout__unit">m</span>
    </div>
  </li>`;
    }
    form.insertAdjacentHTML('afterend', html);
  }
  _renderPopupContent(workout) {
    L.marker(workout.coord)
      .addTo(this.#map)
      .bindPopup(
        L.popup({
          autoClose: false,
          maxWidth: 250,
          minWidth: 100,
          closeOnClick: false,
          className: `${workout.type}-popup`,
        })
      )
      .setPopupContent(
        `${workout.type === 'running' ? '🏃‍♂️' : '🚴‍♀️'}${workout.discription}`
      )
      .openPopup();
  }
  _moveToWorkout(e) {
    const trgt = e.target.closest('.workout');
    //guard clause
    if (!trgt) return;
    const workout = this.#workouts.find(
      workout => workout.id === trgt.dataset.id
    );
    this.#map.setView(workout.coord, this.#mapZoom, {
      animate: true,
      pan: {
        duration: 1,
      },
    });
  }
  _setLocalStorage() {
    localStorage.setItem('workouts', JSON.stringify(this.#workouts));
  }
  _getLocalStorage() {
    const data = JSON.parse(localStorage.getItem('workouts'));
    if (!data) return;
    this.#workouts = data;
    //loading of workouts at form is done here:
    this.#workouts.forEach(workout => this._renderSubmittedForm(workout));
    //marking markers can only be done after loading of maps!
  }
  deleteLocalStorage() {
    localStorage.removeItem('workouts');
    location.reload();
  }
}

const obj1 = new App();

//Creating Child Classes:
class WorkOut {
  id = (Date.now() + '').slice(-10);
  date = new Date();
  constructor(coords, distance, duration) {
    this.coord = coords;
    this.distance = distance;
    this.duration = duration;
  }
  // prettier-ignore
  _setdiscription(){
const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
this.discription=`${this.type[0].toUpperCase(1)}${this.type.slice(1)} on ${months[this.date.getMonth()]} ${this.date.getDate()}`;
}
}

class running extends WorkOut {
  type = 'running';
  constructor(coords, distance, duration, cadence) {
    super(coords, distance, duration);
    this.cadence = cadence;
    this.calcPace();
    this._setdiscription();
  }

  //methods:

  calcPace() {
    this.pace = this.duration / this.distance;
    return this.pace;
  }
}

class cycling extends WorkOut {
  type = 'cycling';
  constructor(coords, distance, duration, elevation) {
    super(coords, distance, duration);
    this.elevation = elevation;
    this.calcSpeed();
    this._setdiscription();
  }
  calcSpeed() {
    this.speed = this.distance / (this.duration / 60);
    return this.speed;
  }
}
