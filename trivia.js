(() => {
'use strict';
const planets='https://science.nasa.gov/solar-system/planets/', apollo='https://www.nasa.gov/mission/apollo-11/';
const QUESTIONS=[
{id:'largest',prompt:'Which is the largest planet in our solar system?',options:['Earth','Jupiter','Neptune'],answer:1,fact:'Jupiter is the largest planet in our solar system.',source:planets},
{id:'apollo',prompt:'Which mission first landed people on the Moon?',options:['Apollo 11','Apollo 8','Artemis I'],answer:0,fact:'Apollo 11 landed Neil Armstrong and Buzz Aldrin on the Moon in July 1969.',source:apollo},
{id:'hottest',prompt:'Which planet has the hottest surface?',options:['Mercury','Mars','Venus'],answer:2,fact:'Venus’s thick atmosphere traps heat, making it hotter than Mercury.',source:'https://science.nasa.gov/venus/venus-facts/'},
{id:'eighth',prompt:'Which planet is eighth from the Sun?',options:['Saturn','Neptune','Uranus'],answer:1,fact:'Neptune is the eighth and most distant planet from the Sun.',source:planets},
{id:'count',prompt:'How many planets are in our solar system?',options:['Eight','Nine','Ten'],answer:0,fact:'Our solar system has eight planets. Pluto is classified as a dwarf planet.',source:planets},
{id:'landing-year',prompt:'In what year did Apollo 11 land on the Moon?',options:['1959','1979','1969'],answer:2,fact:'Apollo 11 landed on the Moon in July 1969.',source:apollo}];
const REWARD=10;
function rewardForState(state){
const rules=globalThis.SpaceportRules;
const grants=rules?.MISSIONS?.filter(q=>rules.isMissionAvailable(state,q.id)).map(q=>q.reward)||[];
return Math.max(REWARD,Math.round(Math.max(0,...grants)/100)*10);
}
function normalize(raw){
const claimed=QUESTIONS.filter(q=>Array.isArray(raw?.claimed)&&raw.claimed.includes(q.id)).map(q=>q.id);
const index=Number.isInteger(raw?.index)&&raw.index>=0&&raw.index<QUESTIONS.length?raw.index:0;
const last=raw?.last?.id===QUESTIONS[index].id&&Number.isInteger(raw.last.choice)&&raw.last.choice>=0&&raw.last.choice<3?{id:raw.last.id,choice:raw.last.choice,reward:Number.isFinite(raw.last.reward)&&raw.last.reward>=0?raw.last.reward:(raw.last.choice===QUESTIONS[index].answer?REWARD:0)}:null;
return {claimed,index,last};}
function current(state){const data=normalize(state.trivia);return {data,question:QUESTIONS[data.index],complete:data.claimed.length===QUESTIONS.length};}
function answer(state,id,choice){const {data,question,complete}=current(state);
if(complete||data.last||id!==question.id||!Number.isInteger(choice)||choice<0||choice>=question.options.length)return null;
const correct=choice===question.answer,reward=correct&&!data.claimed.includes(id)?rewardForState(state):0;
if(reward){data.claimed.push(id);state.wallet+=reward;}data.last={id,choice,reward};state.trivia=data;return {correct,reward};}
function finish(state){const {data,complete}=current(state);if(!complete||!data.last)return false;data.last=null;state.trivia=data;return true;}
function next(state){const data=normalize(state.trivia);if(!data.last)return false;
for(let offset=1;offset<=QUESTIONS.length;offset++){const i=(data.index+offset)%QUESTIONS.length;if(!data.claimed.includes(QUESTIONS[i].id)){data.index=i;data.last=null;state.trivia=data;return true;}}
state.trivia=data;return false;}
globalThis.SpaceportTrivia={QUESTIONS,REWARD,rewardForState,normalize,current,answer,next,finish};
})();
