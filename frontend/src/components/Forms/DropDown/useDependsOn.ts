import {useEffect} from 'react';
import {useFormContext} from 'react-hook-form';

/**
 * Clear `name` when the user changes any parent field
 * (Country -> State -> City: City depends on ['country', 'state']).
 * Only user edits clear it, not form resets, so edit forms keep saved values.
 */
const useDependsOn = (name: string, dependsOn?: string | string[]) => {
  const {watch, setValue} = useFormContext();
  const parents = dependsOn ? [dependsOn].flat() : [];
  const key = parents.join('|');

  useEffect(() => {
    if (!parents.length) return;
    const sub = watch((_values, {name: changed, type}) => {
      if (type === 'change' && changed && parents.includes(changed)) {
        setValue(name, '', {shouldDirty: true});
      }
    });
    return () => sub.unsubscribe();
  }, [name, key, watch, setValue]);
};

export default useDependsOn;
