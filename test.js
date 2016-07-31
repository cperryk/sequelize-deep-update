const assert = require('chai').assert;
const Sequelize = require('sequelize');
const deepUpdate = require('./index.js');

const db_name = process.env.DB_NAME || 'test';
const db_user = process.env.DB_USER || 'root';
const db_pass = process.env.DB_PASS || 'root';

describe('Test relationships', function(done){
  let poll;

  before(function(done){

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
    const Gallery = sequelize.define('galleries', {
      title: Sequelize.STRING
    });

    Poll.hasMany(Choice);
    Poll.hasOne(Thumb);
    Poll.belongsTo(Article);
    Poll.belongsToMany(Gallery, {through: 'gallery'});

    sequelize.sync({
      force: true
    })
    .then(()=>{
      return Poll.create({
        title: "Test poll",
        choices: [ // for hasMany
          {label: 'Choice A'},
          {label: 'Choice B'}
        ],
        thumb: { // for hasOne
          src: 'thumbA.jpg'
        },
        article: { // for belongsTo
          headline: 'Headline A'
        },
        galleries: [ // for belongsToMany
          {title: 'Gallery A'},
          {title: 'Gallery B'}
        ]
      }, {include: [{all: true}]});
    })
    .then((result)=>{
      poll = result;
      done();
    })
    .catch(done);
  });

  describe('hasMany tests', function(){

    let choice_a_id;
    let choice_b_id;

    before(function(done){
      choice_a_id = poll.choices[0].id;
      choice_b_id = poll.choices[1].id;
      return deepUpdate(poll, {
        choices: [{
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
    it('Should disassociate any records that are not included in the update.', function(done){
      assert.equal(poll.choices.length, 2);
      done();
    });
    it('If an empty array is passed, should deassociate all records.', function(done){
      deepUpdate(poll, {
        choices: []
      })
      .then((poll)=>{
        assert.strictEqual(poll.choices.length, 0);
        done();
      })
      .catch(done);
    });

  });

  describe('belongsTo tests', function(){

    it('Should update an existing record if an ID is included', function(done){
      let article_id = poll.article.id;
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
      })
      .catch(done);
    });
    it('Should create a new record if an ID is included', function(done){
      let article_id = poll.article.id;
      deepUpdate(poll, {
        article: {
          headline: 'Headline B'
        }
      })
      .then((poll)=>{
        assert.notEqual(poll.article.id, article_id);
        assert.equal(poll.article.headline, 'Headline B');
        done();
      })
      .catch(done);
    });
    it('Should disassociate the record if null is passed, setting the field to null', function(done){
      deepUpdate(poll, {
        article: null
      })
      .then((poll)=>{
        assert.isNull(poll.article);
        done();
      })
      .catch(done);
    });

  });

  describe('hasOne tests', function(){

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
      })
      .catch(done);
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
      })
      .catch(done);
    });

    it('Should disassociate the record if null is passed, setting the field to null', function(done){
      deepUpdate(poll, {thumb: null})
        .then((poll)=>{
          assert.isNull(poll.thumb);
          done();
        })
        .catch(done);
    });
  });

  describe('belongsToMany tests', function(){

    it('Should update the galleries to which it is associated', function(done){
      const gallery_a_id = poll.galleries[0].id;
      deepUpdate(poll, {
        galleries: [
          {
            id: gallery_a_id,
            title: 'Gallery A2'
          }
        ]
      })
      .then((poll)=>{
        assert.equal(poll.galleries[0].id, gallery_a_id);
        done();
      })
      .catch(done);
    });

    it('Should create a new record if an ID is not included', function(done){
      deepUpdate(poll, {
        galleries: [{
            title: 'Gallery C'
        }]
      })
      .then((poll)=>{
        assert.equal(poll.galleries[0].title, 'Gallery C');
        done();
      })
      .catch(done);
    });

    it('Should disassociate all records if an empty array is passed', function(done){
      deepUpdate(poll, {galleries: []})
        .then((poll)=>{
          assert.strictEqual(poll.galleries.length, 0);
          done();
        })
        .catch(done);
    });
  });

});
