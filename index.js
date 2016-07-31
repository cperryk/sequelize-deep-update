/**
 * Sets and saves a Sequelize instance and all
 * associated nested instances.
 * @param  {SequelizeInstance} instance
 * @param  {object} new_attrs
 * @return {null}
 *
 * A rundown of this function:
 * 1. Look up all the outgoing associations for the instance's model.
 * 2. Remove all existing associated instances from this instance.
 * 3. For each associated instance as described in new_attkrs, update it
 * 		if it already exists. Create it if it doesn't.
 * 4. Reassociate all old instances and associate new one.
 * 5. Save the instance.
 * 6. Return the updated populated object of this instance.
 */
const util = require('util');

function capitalizeFirst(string) {
  return string.charAt(0).toUpperCase() + string.slice(1);
}

module.exports = function deepUpdate(instance, new_attrs){

  // console.log('model', instance.Model);

  // console.log('associationType', instance.Model.associations.choices.associationType);

  // includeMap is a dictionary of attribute name to Sequelize instance
  const associations = instance.$options.includeMap;

  // console.log(associations);

  // Update all of the attributes of the root instance
  // instance.set(new_attrs);

  // Iterate through all of the associations from this model
  const update_associations = Object.keys(associations).map((associated)=>{

    if(!new_attrs[associated]){
      return Promise.resolve();
    }

    const assoc = associations[associated];


    // Retrieve the associated model
    const assoc_model = associations[associated].model;

    // console.log(assoc_model);

    // Determine whether this is a single association (containing one instance) or multi.
    const assoc_type  = instance.Model.associations[associated].associationType;
    // if(assoc_type === 'HasOne'){
    //   return Promise.resolve();
    // }
    const single = {
      HasMany: false,
      HasOne: true,
      BelongsTo: true,
      BelongsToMany: false
    }[assoc_type];

    // console.log(assoc_type, single);

    // Get the name of the prototype function on @instance that will set the associated
    // instances for this association. Seqeulize capitalizes the name of the model.
    const set_fnc_name = 'set' + capitalizeFirst(single ? assoc_model.options.name.singular : assoc_model.options.name.plural);
    const add_fnc_name = (single ? 'set' : 'add') + capitalizeFirst(single ? assoc_model.options.name.singular : assoc_model.options.name.plural);

    console.log(set_fnc_name);

    // Remove all existing associated instances for the current key
    // console.log('set fnc name: ', set_fnc_name);

    let prom = instance[set_fnc_name](null);


    // Get the NEW object for that association field, as defined by new_attrs
    let val = new_attrs[associated];

    if(!Array.isArray(val)) val = [val];

    // For each object in this association key
    const update_instances = val.map((obj)=>{

      // If the object has an ID, retrieve it and update it.
      if(obj.id){
        prom = prom.then(()=> assoc_model.findById(obj.id)
          .then((result)=>{
            result.set(obj);
            return result.save();
          }));
      }
      // If the object does not have an ID, it's new, so create it.
      else{
        prom = prom.then(()=> assoc_model.create(obj));
      }
      // Associate everything again.
      return prom
        .then((result)=>{

          // Determine which function on @instance prototype to use. "Add" fncs do not exist on single
          // assocations, only set.
          return instance[add_fnc_name](result);
        }).then((result)=>{
          return result;
        });
    });

    return Promise.all(update_instances);

  });
  return Promise.all(update_associations)
    .then(()=> instance.save())
    .then(()=> instance.reload())
    .catch((err)=> console.log(err));
};
