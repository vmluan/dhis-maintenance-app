import {
    PROGRAM_INDICATOR_LOAD,
    PROGRAM_INDICATOR_SAVE,
    PROGRAM_INDICATOR_SAVE_SUCCESS,
    PROGRAM_INDICATOR_SAVE_ERROR,
    PROGRAM_INDICATOR_TO_EDIT_FIELD_CHANGED,
    loadProgramIndicatorSuccess,
    saveProgramIndicatorSuccess,
    saveProgramIndicatorError
} from './actions';
import { notifyUser } from '../actions';
import programIndicatorStore from './programIndicatorStore';
import { get, compose } from 'lodash/fp';
import { Observable } from 'rxjs';
import { combineEpics } from 'redux-observable';
import { getInstance } from 'd2/lib/d2';
import { requestParams } from '../SingleModelStore';
import { createModelToEditEpic } from '../epicHelpers';
import { programIndicatorFromStoreSelector } from './selectors';
import { goToAndScrollUp } from '../../router-utils';

function loadProgramIndicator(programIndicatorId) {
    return Observable.fromPromise(
        getInstance()
            .then(d2 => {
                if (programIndicatorId === 'add') {
                    return d2.models.programIndicator.create();
                }
                return d2.models.programIndicator.get(programIndicatorId, requestParams.get('programIndicator'))
            })
            .then(programIndicator => ({ programIndicator }))
    );
}

export const programIndicatorLoad = programIndicatorStore => action$ => action$
    .ofType(PROGRAM_INDICATOR_LOAD)
    .map(get('payload.id'))
    .flatMap(loadProgramIndicator)
    .do(storeState => programIndicatorStore.setState(storeState))
    .mapTo(loadProgramIndicatorSuccess());

export const programIndicatorEdit = programIndicatorStore => createModelToEditEpic(PROGRAM_INDICATOR_TO_EDIT_FIELD_CHANGED, programIndicatorStore, 'programIndicator');

export const programIndicatorSave = programIndicatorStore => action$ => action$
    .ofType(PROGRAM_INDICATOR_SAVE)
    .mapTo(programIndicatorStore)
    .map(programIndicatorFromStoreSelector)
    .mergeMap(programIndicator => {
        return Observable.fromPromise(programIndicator.save())
            .mapTo(saveProgramIndicatorSuccess())
            .do(() => goToAndScrollUp(`/list/indicatorSection/programIndicator`))
            .catch(error => Observable.from(saveProgramIndicatorError()));
    });

export const programModelSaveResponses = action$ => Observable
    .merge(
        action$
            .ofType(PROGRAM_INDICATOR_SAVE_SUCCESS)
            .mapTo(notifyUser('success')),
        action$
            .ofType(PROGRAM_INDICATOR_SAVE_ERROR)
            .map(action => {
                const getFirstErrorMessageFromAction = compose(get('message'), first, flatten, values, getOr([], 'errors'), first);
                const firstErrorMessage = getFirstErrorMessageFromAction(action.payload);

                return notifyUser({ message: firstErrorMessage, translate: false });
            })
    );

export default (function createEpicsForStore(store) {
    return combineEpics(
        programIndicatorLoad(store),
        programIndicatorEdit(store),
        programIndicatorSave(store),
        programModelSaveResponses,
    );
}(programIndicatorStore));
