const statesJson = require('../model/states.json');

/*
        This'll take in the user's request, returning true if the provided state code is valid or false otherwise.
*/
const isValidStateCode = (req) => {
    if (!req.params?.state) 
    {
        return res.status(400).json({ 'message': 'State code required.' });
    }
    const stateCode = statesJson.map(state => state.code); // array of state codes
    const upcaseState = req.params.state.toUpperCase(); // user requested state
    return (stateCode.includes(upcaseState));
}
module.exports = isValidStateCode;