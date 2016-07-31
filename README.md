# sequelize-deep-update

Update a sequelize instance _and_ its associated records with a single method.

## Usage ##

Suppose you have a poll with two choices, labelled "Choice A" and "Choice B". The following code will update the label of "Choice A" to "ChoiceA2", drop "Choice B", and create a new associated choice, "Choice C".

```
const deepUpdate = require("sequelize-deep-update");
Poll.findById(1, {include: [Choice]})
  .then((poll)=>{
    console.log(poll.Choices[0].label); // "Choice A"
    console.log(poll.Choices[1].label); // "Choice B"
    return deepUpdate(poll, {
      title: 'My new poll title',
      Choices: [{
        label: 'Choice A2'
        id: 1,
      }, {
        label: 'Choice C'
      }]
    });
  })
  .then((poll)=>{
    console.log(poll.Choices[0].label); // "Choice A2"
    console.log(poll.Choices[1].label); // "Choice C"
  })
```

## Limitations ##

This has not been tested with scopes.

This will almost definitely need to be refactored for Sequelize 4.0!

## Testing ##

To test, run `npm run test`. The tests expect you to have a local mysql db called `test` with username `root` and password `root`. You can modify this with environment variables `DB_NAME`, `DB_USER`, `DB_PASS`.
