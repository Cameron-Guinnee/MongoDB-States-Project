const statesJson = require('../model/states.json');

const getStateName = (stateCode) => {
    const jsonState = statesJson.filter(state => state.code === stateCode)[0];
    return jsonState.state;
}
module.exports = getStateName;