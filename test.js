const assert = require('chai').assert;
const Sequelize = require('sequelize');
const deepUpdate = require('./index.js');

const db_name = process.env.NB_NAME || 'test';
const db_user = process.env.DB_USER || 'root';
const db_pass = process.env.DB_PASS || 'root';

describe('Test relationships', function(done){

  // set up db
  const sequelize = new Sequelize('test', 'root', 'root', {
    logging: false
  });
  const Poll = sequelize.define('poll', {
    title: Sequelize.STRING
  });
  const Choice = sequelize.define('choice', {
    label: Sequelize.STRING
  });
  const Article = sequelize.define('article', {
    headline: Sequelize.STRING
  });
  const Thumb = sequelize.define('thumb', {
    src: Sequelize.STRING
  });

  Poll.hasMany(Choice, {as: 'foo'});
  Poll.hasOne(Thumb);
  Poll.belongsTo(Article);

  let poll;

  before(function(done){
    sequelize.sync({
      force: true
    })
    .then(()=>{
      return Poll.create({
        title: "Test poll",
        foo: [
          {label: 'Choice A'},
          {label: 'Choice B'}
        ],
        thumb: {
          src: 'thumbA.jpg'
        },
        article: {
          headline: 'Headline A'
        }
      }, {include: [{all: true}]});
    })
    .then((result)=>{
      poll = result;
      done();
    });
  });

  describe('Works with hasMany association', function(){

    let choice_a_id;
    let choice_b_id;

    before(function(done){
      choice_a_id = poll.foo[0].id;
      choice_b_id = poll.foo[1].id;
      return deepUpdate(poll, {
        foo: [{
          id: choice_a_id,
          label: 'Choice A2'
        }, {
          label: 'Choice C'
        }]
      })
      .then(()=>{
        done();
      })
      .catch(done);
    });

    it('Should update existing nested records where an ID is included.', function(done){
      assert.equal(poll.choices[0].id, choice_a_id);
      assert.equal(poll.choices[0].label, 'Choice A2');
      done();
    });
    it('Should create new records where an ID is not included', function(done){
      assert.notEqual(poll.choices[1].id, choice_b_id);
      assert.equal(poll.choices[1].label, 'Choice C');
      done();
    });
    it('Should unassociate any records that are not included in the update.', function(done){
      assert.equal(poll.choices.length, 2);
      done();
    });

  });

  describe('Works with belongsTo association', function(){

    it('Should update an existing record if an ID is included', function(done){
      const article_id = poll.article.id;
      deepUpdate(poll, {
        article: {
          id: poll.article.id,
          headline: 'Headline A2',
        }
      })
      .then((poll)=>{
        assert.equal(poll.article.id, article_id);
        assert.equal(poll.article.headline, 'Headline A2');
        done();
      });
    });
  });

  describe('Works with a hasOne association', function(){

    it('Should update an existing record if an ID is included', function(done){
      const thumb_id = poll.thumb.id;
      deepUpdate(poll, {
        thumb: {
          src: 'thumbB.jpg',
          id: thumb_id
        }
      })
      .then((poll)=>{
        assert.equal(poll.thumb.id, thumb_id);
        assert.equal(poll.thumb.src, 'thumbB.jpg');
        done();
      });
    });

    it('Should create a new record if an ID is not included', function(done){
      const thumb_id = poll.thumb.id;
      deepUpdate(poll, {
        thumb: {
          src: 'thumbC.jpg'
        }
      })
      .then((poll)=>{
        assert.notEqual(poll.thumb.id, thumb_id);
        assert.equal(poll.thumb.src, 'thumbC.jpg');
        done();
      });
    });
  });


});
