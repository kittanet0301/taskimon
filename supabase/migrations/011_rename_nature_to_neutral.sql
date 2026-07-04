-- Migration 011: rename nature element to neutral

update pets
set element = 'neutral'
where element = 'nature';
