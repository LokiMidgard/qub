import * as fs from "fs";
import * as path from "path";

export interface Control {
    break(): void;
}

class ForEachControl implements Control {
    private _continue: boolean = true;

    public break(): void {
        this._continue = false;
    }

    public shouldContinue(): boolean {
        return this._continue;
    }
}

/**
 * An interface that iterates over a collection of values.
 */
export interface Iterator<T> {
    /**
     * Whether or not this Iterator has stated iterating.
     */
    hasStarted(): boolean;

    /**
     * Whether or not this Iterator is currently pointing at a value or not. The Iterator could not
     * be pointing at a value if it hasn't started iterating, or if it has finished iterating.
     */
    hasCurrent(): boolean;

    /**
     * Move this Iterator to the next value in the collection. Return whether or not this Iterator
     * has a current value when it is finished moving.
     */
    next(): boolean;

    /**
     * Get the current value that this Iterator is pointing at, or get undefined if the Iterator
     * doesn't have a current value.
     */
    getCurrent(): T;

    /**
     * Get the current value and move this iterator to the next value in the collection.
     */
    takeCurrent(): T;

    /**
     * Get whether or not this Iterator contains any values that match the provided condition. If
     * the condition is not defined, then this function returns whether the collection contains any
     * values. This function may advance the iterator.
     */
    any(condition?: (value: T) => boolean): boolean;

    /**
     * Get the number of values that this Iterator can iterate. The Iterator will not have a current
     * value when this function completes.
     */
    getCount(): number;

    /**
     * Get the first value in this Iterator that matches the provided condition. If no condition
     * is provided, then the first value in the Iterator will be returned. If the Iterator is empty,
     * then undefined will be returned.
     */
    first(condition?: (value: T) => boolean): T;

    /**
     * Apply the provided valueFunction to this Iterator's remaining values. The Iterator will not
     * have a current value when this function completes. This function is synchronous.
     */
    foreach(valueFunction: (value: T, control?: Control) => void): void;

    /**
     * Place each of the values of this Iterator into an array.
     */
    toArray(): T[];

    /**
     * Place each of the values of this Iterator into an ArrayList.
     */
    toArrayList(): ArrayList<T>;

    /**
     * Get an Iterator based on this Iterator that only returns values that match the provided
     * condition.
     */
    where(condition: (value: T) => boolean): Iterator<T>;

    /**
     * Get an Iterator based on this Iterator that skips the provided number of values.
     */
    skip(toSkip: number): Iterator<T>;

    /**
     * Get an Iterator based on this Iterator that only returns the provided number of values.
     */
    take(toTake: number): Iterator<T>;

    /**
     * Get an Iterator based on this Iterator that maps each of this Iterator's values to a
     * different value.
     */
    map<U>(mapFunction: (value: T) => U): Iterator<U>;

    /**
     * Return a new iterator that concatenates the contents of the provided iterator to the contents
     * of this iterator.
     */
    concatenate(iterator: Iterator<T> | T[]): Iterator<T>;
}

export abstract class IteratorBase<T> implements Iterator<T> {
    public abstract hasStarted(): boolean;
    public abstract hasCurrent(): boolean;
    public abstract next(): boolean;
    public abstract getCurrent(): T;

    public takeCurrent(): T {
        const result: T = this.getCurrent();
        this.next();
        return result;
    }

    public getCount(): number {
        let result: number = 0;

        if (this.hasCurrent()) {
            ++result;
        }

        while (this.next()) {
            ++result;
        }

        return result;
    }

    public any(condition?: (value: T) => boolean): boolean {
        let result: boolean;

        if (!condition) {
            result = this.hasCurrent() || this.next();
        }
        else {
            result = false;
            this.foreach((value: T, control: Control) => {
                if (condition(value)) {
                    result = true;
                    control.break();
                }
            });
        }

        return result;
    }

    public first(condition?: (value: T) => boolean): T {
        let result: T;
        if (!condition) {
            if (!this.hasStarted()) {
                this.next();
            }
            result = this.getCurrent();
        }
        else {
            result = this.where(condition).first();
        }
        return result;
    }

    public foreach(valueFunction: (value: T, control?: Control) => void): void {
        if (valueFunction) {
            const control = new ForEachControl();
            if (this.hasCurrent()) {
                valueFunction(this.getCurrent(), control);
            }

            while (control.shouldContinue() && this.next()) {
                valueFunction(this.getCurrent(), control);
            }
        }
    }

    public toArray(): T[] {
        const result: T[] = [];
        this.foreach((value: T) => { result.push(value); });
        return result;
    }

    public toArrayList(): ArrayList<T> {
        return new ArrayList(this.toArray());
    }

    public where(condition: (value: T) => boolean): Iterator<T> {
        return new WhereIterator(this, condition);
    }

    public skip(toSkip: number): Iterator<T> {
        return new SkipIterator(this, toSkip);
    }

    public take(toTake: number): Iterator<T> {
        return new TakeIterator(this, toTake);
    }

    public map<U>(mapFunction: (value: T) => U): Iterator<U> {
        return new MapIterator<U, T>(this, mapFunction);
    }

    public concatenate(toConcatenate: Iterator<T> | T[]): Iterator<T> {
        let result: Iterator<T>;
        if (!toConcatenate) {
            result = this;
        }
        else {
            if (toConcatenate instanceof Array) {
                toConcatenate = new ArrayList<T>(toConcatenate).iterate();
            }
            result = new ConcatenateIterator<T>(this, toConcatenate);
        }
        return result;
    }
}

abstract class IteratorDecorator<T> extends IteratorBase<T> {
    constructor(private _innerIterator: Iterator<T>) {
        super();
    }

    public hasStarted(): boolean {
        return this._innerIterator.hasStarted();
    }

    public hasCurrent(): boolean {
        return this._innerIterator.hasCurrent();
    }

    public next(): boolean {
        return this._innerIterator.next();
    }

    public getCurrent(): T {
        return this._innerIterator.getCurrent();
    }
}

/**
 * An Iterator that only returns values from the inner iterator that match its condition.
 */
class WhereIterator<T> extends IteratorDecorator<T> {
    constructor(innerIterator: Iterator<T>, private _condition: (value: T) => boolean) {
        super(innerIterator);

        if (this._condition) {
            while (this.hasCurrent() && !this._condition(this.getCurrent())) {
                super.next();
            }
        }
    }

    public next(): boolean {
        if (!this._condition) {
            super.next();
        }
        else {
            while (super.next() && !this._condition(this.getCurrent())) {
            }
        }

        return this.hasCurrent();
    }
}

/**
 * An Iterator that skips the first number of values from the provided inner iterator.
 */
class SkipIterator<T> extends IteratorDecorator<T> {
    private _skipped: number = 0;

    constructor(innerIterator: Iterator<T>, private _toSkip: number) {
        super(innerIterator);
    }

    private skipValues(): void {
        while (this._skipped < this._toSkip) {
            if (!super.next()) {
                this._skipped = this._toSkip;
            }
            else {
                ++this._skipped;
            }
        }
    }

    public hasCurrent(): boolean {
        if (super.hasCurrent()) {
            this.skipValues();
        }
        return super.hasCurrent();
    }

    public next(): boolean {
        this.skipValues();
        return super.next();
    }

    public getCurrent(): T {
        if (super.hasCurrent()) {
            this.skipValues();
        }
        return super.getCurrent();
    }
}

/**
 * An Iterator that only takes at most the first number of values from the provided inner iterator.
 */
class TakeIterator<T> extends IteratorDecorator<T> {
    private _taken: number;

    constructor(innerIterator: Iterator<T>, private _toTake: number) {
        super(innerIterator);

        this._taken = super.hasCurrent() ? 1 : 0;
    }

    private canTakeValue(): boolean {
        return isDefined(this._toTake) && this._taken <= this._toTake;
    }

    public hasCurrent(): boolean {
        return super.hasCurrent() && this.canTakeValue();
    }

    public next(): boolean {
        if (this.canTakeValue()) {
            ++this._taken;
            super.next();
        }
        return this.hasCurrent();
    }

    public getCurrent(): T {
        return this.hasCurrent() ? super.getCurrent() : undefined;
    }
}

class MapIterator<OuterT, InnerT> implements Iterator<OuterT> {
    private _started: boolean;

    constructor(private _innerIterator: Iterator<InnerT>, private _mapFunction: (value: InnerT) => OuterT) {
        this._started = _innerIterator.hasStarted();
    }

    public hasStarted(): boolean {
        return this._started;
    }

    public hasCurrent(): boolean {
        return this._mapFunction ? this._innerIterator.hasCurrent() : false;
    }

    public next(): boolean {
        this._started = true;
        return isDefined(this._mapFunction) && this._innerIterator.next();
    }

    public takeCurrent(): OuterT {
        const result: OuterT = this.getCurrent();
        this.next();
        return result;
    }

    public getCurrent(): OuterT {
        return this.hasCurrent() ? this._mapFunction(this._innerIterator.getCurrent()) : undefined;
    }

    public any(condition?: (value: OuterT) => boolean): boolean {
        let result: boolean;

        if (!condition) {
            result = this.hasCurrent() || this.next();
        }
        else {
            result = false;
            this.foreach((value: OuterT, control: Control) => {
                if (condition(value)) {
                    result = true;
                    control.break();
                }
            });
        }

        return result;
    }

    public getCount(): number {
        this._started = true;
        return isDefined(this._mapFunction) ? this._innerIterator.getCount() : 0;
    }

    public first(condition?: (value: OuterT) => boolean): OuterT {
        return this.where(condition).first();
    }

    public foreach(valueFunction: (value: OuterT, control?: Control) => void): void {
        if (this._mapFunction && valueFunction) {
            this._innerIterator.foreach((innerValue: InnerT, control: Control) => {
                valueFunction(this._mapFunction(innerValue), control);
            });
        }
    }

    public toArray(): OuterT[] {
        const result: OuterT[] = [];
        this.foreach((value: OuterT) => { result.push(value); });
        return result;
    }

    public toArrayList(): ArrayList<OuterT> {
        return new ArrayList(this.toArray());
    }

    public where(condition: (value: OuterT) => boolean): Iterator<OuterT> {
        return new WhereIterator(this, condition);
    }

    public skip(toSkip: number): Iterator<OuterT> {
        return new SkipIterator(this, toSkip);
    }

    public take(toTake: number): Iterator<OuterT> {
        return new TakeIterator(this, toTake);
    }

    public map<NewT>(mapFunction: (value: OuterT) => NewT): Iterator<NewT> {
        return new MapIterator(this, mapFunction);
    }

    public concatenate(toConcatenate: Iterator<OuterT>): Iterator<OuterT> {
        return new ConcatenateIterator<OuterT>(this, toConcatenate);
    }
}

class ConcatenateIterator<T> extends IteratorBase<T> {
    public constructor(private _first: Iterator<T>, private _second: Iterator<T>) {
        super();
    }

    public hasStarted(): boolean {
        return this._first.hasStarted();
    }

    public hasCurrent(): boolean {
        return this._first.hasCurrent() || this._second.hasCurrent();
    }

    public next(): boolean {
        return this._first.next() || this._second.next();
    }

    public getCurrent(): T {
        return this._first.hasCurrent() ? this._first.getCurrent() : this._second.getCurrent();
    }
}

/**
 * An interface of a collection that can have its contents iterated through.
 */
export interface Iterable<T> {
    /**
     * Create an iterator for this collection.
     */
    iterate(): Iterator<T>;

    /**
     * Create an iterator for this collection that iterates the collection in reverse order.
     */
    iterateReverse(): Iterator<T>;

    /**
     * Get whether or not this collection contains any values that match the provided condition. If
     * the condition is not defined, then this function returns whether the collection contains any
     * values.
     */
    any(condition?: (value: T) => boolean): boolean;

    /**
     * Get the number of values that are contained in this collection.
     */
    getCount(): number;

    /**
     * Get the value in this collection at the provided index. If the provided index is not defined
     * or is outside of this Iterable's bounds, then undefined will be returned.
     */
    get(index: number): T;

    /**
     * Get the value in this collection at the provided index from the end of the collection. If the
     * provided index is not defined or is outside of this Iterable's bounds, then undefined will be
     * returned.
     */
    getLast(index: number): T;

    /**
     * Get whether or not this Iterable contians the provided value using the provided comparison
     * function. If no comparison function is provided, then a simple '===' comparison will be used.
     */
    contains(value: T, comparison?: (lhs: T, rhs: T) => boolean): boolean;

    /**
     * Apply the provided valueFunction to each value in this collection. This function is
     * synchronous.
     */
    foreach(valueFunction: (value: T, control?: Control) => void): void;

    /**
     * Get the first value in this collection that matches the provided condition. If no condition
     * is provided, then the first value in the collection will be returned. If the collection is
     * empty, then undefined will be returned.
     */
    first(condition?: (value: T) => boolean): T;

    /**
     * Get the last value in this collection. If the collection is empty, then undefined will be
     * returned.
     */
    last(condition?: (value: T) => boolean): T;

    /**
     * Get the values of this Iterable that match the provided condition.
     */
    where(condition: (value: T) => boolean): Iterable<T>;

    /**
     * Get an Iterable that skips the first toSkip number of values from this Iterable.
     */
    skip(toSkip: number): Iterable<T>;

    /**
     * Get an Iterable that skips the last toSkip number of values from this Iterable.
     */
    skipLast(toSkip: number): Iterable<T>;

    /**
     * Get the first toTake number of values from this Iterable<T>.
     */
    take(toTake: number): Iterable<T>;

    /**
     * Get the last toTake number of values from this Iterable<T>.
     */
    takeLast(toTake: number): Iterable<T>;

    /**
     * Get an Iterable based on this Iterable that maps each of this Iterable's values to a
     * different value.
     */
    map<U>(mapFunction: (value: T) => U): Iterable<U>;

    /**
     * Get an Iterable that concatenates the values of this Iterable with the values of the provided
     * Iterable or Array.
     */
    concatenate(toConcatenate: Iterable<T> | T[]): Iterable<T>;

    /**
     * Convert the values of this Iterable into an array.
     */
    toArray(): T[];

    /**
     * Get whether or not this Iterable<T> ends with the provided values.
     */
    endsWith(values: Iterable<T>): boolean;
}

/**
 * A base implementation of the Iterable<T> interface that classes can extend to make implementing
 * Iterable<T> easier.
 */
export abstract class IterableBase<T> implements Iterable<T> {
    public abstract iterate(): Iterator<T>;

    public abstract iterateReverse(): Iterator<T>;

    public any(condition?: (value: T) => boolean): boolean {
        return this.iterate().any(condition);
    }

    public getCount(): number {
        return this.iterate().getCount();
    }

    public get(index: number): T {
        let result: T;
        if (0 <= index) {
            const iterator: Iterator<T> = this.iterate();
            while (iterator.next() && 0 < index) {
                --index;
            }
            result = iterator.getCurrent();
        }
        return result;
    }

    public getLast(index: number): T {
        let result: T;
        if (0 <= index) {
            const iterator: Iterator<T> = this.iterateReverse();
            while (iterator.next() && 0 < index) {
                --index;
            }
            result = iterator.getCurrent();
        }
        return result;
    }

    public contains(value: T, comparison?: (iterableValue: T, value: T) => boolean): boolean {
        if (!comparison) {
            comparison = (iterableValue: T, value: T) => iterableValue === value;
        }

        return this.any((iterableValue: T) => comparison(iterableValue, value));
    }

    public foreach(elementFunction: (value: T, control?: Control) => void): void {
        if (elementFunction) {
            this.iterate().foreach(elementFunction);
        }
    }

    public first(condition?: (value: T) => boolean): T {
        return this.iterate().first(condition);
    }

    public last(condition?: (value: T) => boolean): T {
        return this.iterateReverse().first(condition);
    }

    public where(condition: (value: T) => boolean): Iterable<T> {
        return condition ? new WhereIterable<T>(this, condition) : this;
    }

    public skip(toSkip: number): Iterable<T> {
        return toSkip && 0 < toSkip ? new SkipIterable(this, toSkip) : this;
    }

    public skipLast(toSkip: number): Iterable<T> {
        return toSkip && 0 < toSkip ? this.take(this.getCount() - toSkip) : this;
    }

    public take(toTake: number): Iterable<T> {
        return toTake && 0 < toTake ? new TakeIterable(this, toTake) : new ArrayList<T>();
    }

    public takeLast(toTake: number): Iterable<T> {
        let result: Iterable<T>;
        if (!toTake || toTake < 0) {
            result = new ArrayList<T>();
        }
        else {
            const count: number = this.getCount();
            if (count <= toTake) {
                result = this;
            }
            else {
                result = this.skip(count - toTake);
            }
        }
        return result;
    }

    public map<U>(mapFunction: (value: T) => U): Iterable<U> {
        return mapFunction ? new MapIterable(this, mapFunction) : new ArrayList<U>();
    }

    public concatenate(toConcatenate: Iterable<T> | T[]): Iterable<T> {
        return toConcatenate ? new ConcatenateIterable(this, toConcatenate) : this;
    }

    public toArray(): T[] {
        return this.iterate().toArray();
    }

    public endsWith(values: Iterable<T>): boolean {
        let result: boolean;

        if (!values) {
            result = false;
        }
        else {
            const valuesCount: number = values.getCount();
            if (valuesCount === 0) {
                result = false;
            }
            else if (this.getCount() < valuesCount) {
                result = false;
            }
            else {
                result = true;

                const thisLastValuesIterator: Iterator<T> = this.takeLast(valuesCount).iterate();
                const valuesIterator: Iterator<T> = values.iterate();
                while (thisLastValuesIterator.next() === valuesIterator.next() && thisLastValuesIterator.hasCurrent()) {
                    if (thisLastValuesIterator.getCurrent() !== valuesIterator.getCurrent()) {
                        result = false;
                        break;
                    }
                }
            }
        }

        return result;
    }
}

class WhereIterable<T> extends IterableBase<T> {
    constructor(private _innerIterable: Iterable<T>, private _condition: (value: T) => boolean) {
        super();
    }

    public iterate(): Iterator<T> {
        return this._innerIterable.iterate().where(this._condition);
    }

    public iterateReverse(): Iterator<T> {
        return this._innerIterable.iterateReverse().where(this._condition);
    }
}

class SkipIterable<T> extends IterableBase<T> {
    constructor(private _innerIterable: Iterable<T>, private _toSkip: number) {
        super();
    }

    public iterate(): Iterator<T> {
        return this._innerIterable.iterate().skip(this._toSkip);
    }

    public iterateReverse(): Iterator<T> {
        return this._innerIterable.iterateReverse().take(this.getCount());
    }

    public getCount(): number {
        let result: number = this._innerIterable.getCount();
        if (result <= this._toSkip) {
            result = 0;
        }
        else {
            result -= this._toSkip;
        }
        return result;
    }

    public get(index: number): T {
        return this._innerIterable.get(index + this._toSkip);
    }
}

class TakeIterable<T> extends IterableBase<T> {
    constructor(private _innerIterable: Iterable<T>, private _toTake: number) {
        super();
    }

    public iterate(): Iterator<T> {
        return this._innerIterable.iterate().take(this._toTake);
    }

    public iterateReverse(): Iterator<T> {
        return this._innerIterable.iterateReverse().skip(this._innerIterable.getCount() - this._toTake);
    }

    public getCount(): number {
        let result: number = this._innerIterable.getCount();
        if (this._toTake < result) {
            result = this._toTake;
        }
        return result;
    }

    public get(index: number): T {
        return 0 <= index && index < this.getCount() ? this._innerIterable.get(index) : undefined;
    }
}

class MapIterable<OuterT, InnerT> implements Iterable<OuterT> {
    constructor(private _innerIterable: Iterable<InnerT>, private _mapFunction: (value: InnerT) => OuterT) {
    }

    public iterate(): Iterator<OuterT> {
        return this._innerIterable.iterate().map(this._mapFunction);
    }

    public iterateReverse(): Iterator<OuterT> {
        return this._innerIterable.iterateReverse().map(this._mapFunction);
    }

    public any(condition?: (value: OuterT) => boolean): boolean {
        return this.iterate().any(condition);
    }

    public getCount(): number {
        return this._innerIterable.getCount();
    }

    public get(index: number): OuterT {
        return this._mapFunction && isDefined(index) && 0 <= index && index < this.getCount() ? this._mapFunction(this._innerIterable.get(index)) : undefined;
    }

    public getLast(index: number): OuterT {
        return this._mapFunction && isDefined(index) && 0 <= index && index < this.getCount() ? this._mapFunction(this._innerIterable.getLast(index)) : undefined;
    }

    public contains(value: OuterT, comparison?: (lhs: OuterT, rhs: OuterT) => boolean): boolean {
        if (!comparison) {
            comparison = (lhs: OuterT, rhs: OuterT) => lhs === rhs;
        }

        return this.any((iterableValue: OuterT) => comparison(iterableValue, value));
    }

    public foreach(valueFunction: (value: OuterT, control?: Control) => void): void {
        this.iterate().foreach(valueFunction);
    }

    public first(condition?: (value: OuterT) => boolean): OuterT {
        return this.iterate().first(condition);
    }

    public last(condition?: (value: OuterT) => boolean): OuterT {
        return this.iterateReverse().first(condition);
    }

    public where(condition: (value: OuterT) => boolean): Iterable<OuterT> {
        return condition ? new WhereIterable(this, condition) : this;
    }

    public skip(toSkip: number): Iterable<OuterT> {
        return toSkip && 0 < toSkip ? new SkipIterable(this, toSkip) : this;
    }

    public skipLast(toSkip: number): Iterable<OuterT> {
        return toSkip && 0 < toSkip ? this.take(this.getCount() - toSkip) : this;
    }

    public take(toTake: number): Iterable<OuterT> {
        return toTake && 0 < toTake ? new TakeIterable(this, toTake) : new ArrayList<OuterT>();
    }

    public takeLast(toTake: number): Iterable<OuterT> {
        let result: Iterable<OuterT>;
        if (!toTake || toTake < 0) {
            result = new ArrayList<OuterT>();
        }
        else {
            const count: number = this.getCount();
            if (count <= toTake) {
                result = this;
            }
            else {
                result = this.skip(count - toTake);
            }
        }
        return result;
    }

    public map<NewT>(mapFunction: (value: OuterT) => NewT): Iterable<NewT> {
        return mapFunction ? new MapIterable<NewT, OuterT>(this, mapFunction) : new ArrayList<NewT>();
    }

    public concatenate(toConcatenate: Iterable<OuterT> | OuterT[]): Iterable<OuterT> {
        return toConcatenate ? new ConcatenateIterable<OuterT>(this, toConcatenate) : this;
    }

    public toArray(): OuterT[] {
        return this.iterate().toArray();
    }

    public endsWith(values: Iterable<OuterT>): boolean {
        let result: boolean;

        if (!values) {
            result = false;
        }
        else {
            const valuesCount: number = values.getCount();
            if (valuesCount === 0) {
                result = false;
            }
            else if (this.getCount() < valuesCount) {
                result = false;
            }
            else {
                result = true;

                const thisLastValuesIterator: Iterator<OuterT> = this.takeLast(valuesCount).iterate();
                const valuesIterator: Iterator<OuterT> = values.iterate();
                while (thisLastValuesIterator.next() === valuesIterator.next() && thisLastValuesIterator.hasCurrent()) {
                    if (thisLastValuesIterator.getCurrent() !== valuesIterator.getCurrent()) {
                        result = false;
                        break;
                    }
                }
            }
        }

        return result;
    }
}

class ConcatenateIterable<T> extends IterableBase<T> {
    private _first: Iterable<T>;
    private _second: Iterable<T>;

    constructor(first: Iterable<T>, second: Iterable<T> | T[]) {
        super();
        this._first = first;
        this._second = new ArrayList<T>(second);
    }

    public iterate(): Iterator<T> {
        return this._first.iterate().concatenate(this._second.iterate());
    }

    public iterateReverse(): Iterator<T> {
        return this._second.iterateReverse().concatenate(this._first.iterateReverse());
    }
}

export abstract class ArrayListIterator<T> extends IteratorBase<T> {
    protected _currentIndex: number;

    constructor(protected _arrayList: ArrayList<T>) {
        super();
    }

    /**
     * Whether or not this ArrayListIterator is at the end of its iterating.
     */
    protected abstract atEnd(): boolean;

    public hasStarted(): boolean {
        return isDefined(this._currentIndex);
    }

    public hasCurrent(): boolean {
        return this.hasStarted() && !this.atEnd();
    }

    public abstract next(): boolean;

    public getCurrent(): T {
        return this._arrayList.get(this._currentIndex);
    }
}

class ArrayListForwardIterator<T> extends ArrayListIterator<T> {
    constructor(arrayList: ArrayList<T>) {
        super(arrayList);
    }

    protected atEnd(): boolean {
        return this._currentIndex === this._arrayList.getCount();
    }

    public next(): boolean {
        if (!this.hasStarted()) {
            this._currentIndex = 0;
        }
        else if (!this.atEnd()) {
            ++this._currentIndex;
        }
        return !this.atEnd();
    }
}

class ArrayListReverseIterator<T> extends ArrayListIterator<T> {
    constructor(arrayList: ArrayList<T>) {
        super(arrayList);
    }

    protected atEnd(): boolean {
        return this._currentIndex < 0;
    }

    public next(): boolean {
        if (!this.hasStarted()) {
            this._currentIndex = this._arrayList.getCount() - 1;
        }
        else if (!this.atEnd()) {
            --this._currentIndex;
        }
        return !this.atEnd();
    }
}

export class ArrayList<T> extends IterableBase<T> {
    private _data: T[] = [];
    private _count: number = 0;

    constructor(values?: T[] | Iterable<T>) {
        super();

        this.addAll(values);
    }

    public iterate(): ArrayListIterator<T> {
        return new ArrayListForwardIterator<T>(this);
    }

    public iterateReverse(): ArrayListIterator<T> {
        return new ArrayListReverseIterator<T>(this);
    }

    public get(index: number): T {
        let result: T;
        if (isDefined(index) && 0 <= index && index < this._count) {
            result = this._data[index];
        }
        return result;
    }

    /**
     * Set the ArrayList value at the provided index to be the provided value. If the index is not
     * defined or is outside of the Arraylist's bounds, then this function will do nothing.
     */
    public set(index: number, value: T): void {
        if (isDefined(index) && 0 <= index && index < this._count) {
            this._data[index] = value;
        }
    }

    /**
     * Set the last ArrayList value to be the provided value. If the ArrayList is empty, then this
     * function will do nothing.
     */
    public setLast(value: T): void {
        if (this.any()) {
            this._data[this._count - 1] = value;
        }
    }

    public any(condition?: (value: T) => boolean): boolean {
        return condition ? super.any(condition) : this._count > 0;
    }

    public getCount(): number {
        return this._count;
    }

    public add(value: T): void {
        if (this._count === this._data.length) {
            this._data.push(value);
        }
        else {
            this._data[this._count] = value;
        }
        this._count++;
    }

    public addAll(values: T[] | Iterable<T>): void {
        if (values) {
            if (values instanceof Array) {
                for (const value of values) {
                    this.add(value);
                }
            }
            else {
                values.foreach((value: T) => { this.add(value); });
            }
        }
    }

    public indexOf(value: T, comparer?: (lhs: T, rhs: T) => boolean): number {
        let result: number;
        for (let i = 0; i < this._count; ++i) {
            if (comparer ? comparer(this._data[i], value) : this._data[i] === value) {
                result = i;
                break;
            }
        }
        return result;
    }

    public removeAt(index: number): T {
        let result: T;
        if (isDefined(index) && 0 <= index && index < this._count) {
            result = this._data[index];

            for (let i = index; i < this._count - 1; ++i) {
                this._data[i] = this._data[i + 1];
            }
            this._data[this._count - 1] = undefined;
            this._count--;
        }
        return result;
    }

    public remove(value: T, comparer?: (lhs: T, rhs: T) => boolean): T {
        let result: T;

        const removeIndex: number = this.indexOf(value, comparer);
        if (isDefined(removeIndex)) {
            result = this.removeAt(removeIndex);
        }

        return result;
    }

    public removeFirst(): T {
        return this.removeAt(0);
    }

    public removeLast(): T {
        return this.removeAt(this.getCount() - 1);
    }
}

export interface KeyValuePair<KeyType, ValueType> {
    key: KeyType;
    value: ValueType;
}

/**
 * A map/dictionary collection that associates a key to a value.
 */
export class Map<KeyType, ValueType> {
    private _pairs = new ArrayList<KeyValuePair<KeyType, ValueType>>();

    constructor(initialValues?: KeyValuePair<KeyType, ValueType>[] | Iterable<KeyValuePair<KeyType, ValueType>>) {
        this.addAll(initialValues);
    }

    /**
     * Get the number of entries in this map.
     */
    public getCount(): number {
        return this._pairs.getCount();
    }

    /**
     * Add the provide key value pair to the Map. If an entry already exists with the provided key,
     * the existing entry will be overwritten by the provided values.
     */
    public add(key: KeyType, value: ValueType): void {
        const pair: KeyValuePair<KeyType, ValueType> = {
            key: key,
            value: value
        };
        this._pairs.remove(pair, (lhs, rhs) => lhs.key === rhs.key);
        this._pairs.add(pair);
    }

    /**
     * Add each of the provided pairs to this Map. If any of the entries already exists with the
     * provided key, the existing entry will be overwritten by the provided value.
     */
    public addAll(keyValuePairs: KeyValuePair<KeyType, ValueType>[] | Iterable<KeyValuePair<KeyType, ValueType>>): void {
        if (keyValuePairs instanceof Array) {
            for (const keyValuePair of keyValuePairs) {
                this.add(keyValuePair.key, keyValuePair.value);
            }
        }
        else if (keyValuePairs) {
            keyValuePairs.foreach((keyValuePair: KeyValuePair<KeyType, ValueType>) => {
                this.add(keyValuePair.key, keyValuePair.value);
            });
        }
    }

    /**
     * Get whether or not the map contains the provided key.
     */
    public contains(key: KeyType): boolean {
        return this._pairs.any((pair) => pair.key === key);
    }

    /**
     * Get the value associated with the provided key. If the provided key is not found in the map,
     * then undefined will be returned.
     */
    public get(key: KeyType): ValueType {
        const pair: KeyValuePair<KeyType, ValueType> = this._pairs.first((pair) => pair.key === key);
        return pair ? pair.value : undefined;
    }
}

/**
 * A stack collection that can only add and remove elements from one end.
 */
export class Stack<T> {
    private _values = new ArrayList<T>();

    /**
     * Get whether or not this stack has any values.
     */
    public any(): boolean {
        return this._values.any();
    }

    /**
     * Get the number of values that are on the stack.
     */
    public getCount(): number {
        return this._values.getCount();
    }

    /**
     * Get whether this stack contains the provided value using the optional comparison. If the
     * comparison function is not provided, then === will be used.
     * @param value The value to search for in this stack.
     * @param comparison The optional comparison function to use to compare values.
     */
    public contains(value: T, comparison?: (lhs: T, rhs: T) => boolean): boolean {
        return this._values.contains(value, comparison);
    }

    /**
     * Add the provided value to the top of the stack.
     * @param value The value to add.
     */
    public push(value: T): void {
        this._values.add(value);
    }

    /**
     * Remove and return the value at the top of the stack.
     */
    public pop(): T {
        return this._values.removeLast();
    }

    /**
     * Return (but don't remove) the value at the top of the stack.
     */
    public peek(): T {
        return this._values.last();
    }
}

/**
 * A First-In-First-Out (FIFO) data structure.
 */
export class Queue<T> {
    private _values = new ArrayList<T>();

    /**
     * Get whether or not this queue has any values.
     */
    public any(): boolean {
        return this._values.any();
    }

    /**
     * Get the number of values that are in the queue.
     */
    public getCount(): number {
        return this._values.getCount();
    }

    /**
     * Get whether or not this queue contains the provided value using the optional comparison. If
     * The optional comparison is not provided, then === will be used.
     * @param value The value to search for.
     * @param comparison The optional comparison to compare values.
     */
    public contains(value: T, comparison?: (lhs: T, rhs: T) => boolean): boolean {
        return this._values.contains(value, comparison);
    }

    /**
     * Add the provided value to the start of this queue.
     * @param value The value to add to this queue.
     */
    public enqueue(value: T): void {
        this._values.add(value);
    }

    /**
     * Take the next value off of the end of this queue.
     */
    public dequeue(): T {
        return this._values.removeFirst();
    }
}

export function quote(value: string): string {
    let result: string;
    if (value === undefined) {
        result = "undefined";
    }
    else if (value === null) {
        result = "null";
    }
    else {
        result = `"${value}"`;
    }
    return result;
}

export function escape(documentText: string): string {
    let result: string = documentText;
    if (result) {
        let newResult: string = result;
        do {
            result = newResult;
            newResult = result.replace("\n", "\\n")
                .replace("\t", "\\t")
                .replace("\r", "\\r");
        }
        while (result !== newResult);
    }
    return result;
}

export function escapeAndQuote(text: string): string {
    return quote(escape(text));
}

export function toLowerCase(text: string): string {
    return text ? text.toLowerCase() : text;
}

export function isDefined(value: any): boolean {
    return value !== undefined && value !== null;
}

export function getLength(value: any[] | string): number {
    return isDefined(value) ? value.length : 0;
}

export function startsWith(value: string, prefix: string): boolean {
    return value && prefix && (prefix === value.substr(0, prefix.length));
}

export function startsWithIgnoreCase(value: string, prefix: string): boolean {
    return value && prefix && (prefix.toLowerCase() === value.substr(0, prefix.length).toLowerCase());
}

/**
 * Get whether or not the provided value ends with the provided suffix.
 * @param value The value to check.
 * @param suffix The suffix to look for.
 */
export function endsWith(value: string, suffix: string): boolean {
    return value && suffix && value.length >= suffix.length && value.substring(value.length - suffix.length) === suffix ? true : false;
}

/**
 * Get whether or not the provided value contains the provided searchString.
 * @param value The value to look in.
 * @param searchString The string to search for.
 */
export function contains(value: string, searchString: string): boolean {
    return value && searchString && value.indexOf(searchString) !== -1 ? true : false;
}

export function repeat(value: string, count: number): string {
    let result: string = "";
    if (value && count && count > 0) {
        for (let i = 0; i < count; ++i) {
            result += value;
        }
    }
    return result;
}

export function getLineIndex(value: string, characterIndex: number): number {
    let result: number;

    if (isDefined(value) && isDefined(characterIndex) && 0 <= characterIndex) {
        result = 0;
        for (let i = 0; i < characterIndex; ++i) {
            if (value[i] === "\n") {
                ++result;
            }
        }
    }

    return result;
}

export function getColumnIndex(value: string, characterIndex: number): number {
    let result: number;

    if (isDefined(value) && isDefined(characterIndex) && 0 <= characterIndex) {
        result = 0;
        for (let i = 0; i < characterIndex; ++i) {
            if (value[i] === "\n") {
                result = 0;
            }
            else {
                ++result;
            }
        }
    }

    return result;
}

export function getLineIndent(value: string, characterIndex: number): string {
    let result: string;

    const columnIndex: number = getColumnIndex(value, characterIndex);
    if (isDefined(columnIndex)) {
        let indentCharacterIndex: number = characterIndex - columnIndex;
        result = "";
        while (value[indentCharacterIndex] === " " || value[indentCharacterIndex] === "\t") {
            result += value[indentCharacterIndex];
            ++indentCharacterIndex;
        }
    }

    return result;
}

/**
 * A value that has a startIndex property.
 */
export interface HasStartIndex {
    startIndex: number;
}

/**
 * Get the start index of the provided values.
 * @param values
 */
export function getStartIndex(values: HasStartIndex[] | Iterable<HasStartIndex> | Iterator<HasStartIndex>): number {
    let result: number;
    if (values) {
        if (values instanceof Array) {
            if (values.length > 0) {
                result = values[0].startIndex;
            }
        }
        else {
            if (values.any()) {
                result = values.first().startIndex;
            }
        }
    }
    return result;
}

/**
 * A value that has an afterEndIndex property.
 */
export interface HasAfterEndIndex {
    afterEndIndex: number;
}

/**
 * Get the after end index of the provided values.
 * @param values
 */
export function getAfterEndIndex(values: HasAfterEndIndex[] | Iterable<HasAfterEndIndex>): number {
    let result: number;
    if (values) {
        if (values instanceof Array) {
            if (values.length > 0) {
                result = values[values.length - 1].afterEndIndex;
            }
        }
        else {
            if (values.any()) {
                result = values.last().afterEndIndex;
            }
        }
    }
    return result;
}

export function getSpan(values: HasStartIndexAndAfterEndIndex[] | Iterable<HasStartIndexAndAfterEndIndex>): Span {
    let result: Span;

    if (values) {
        if (values instanceof Array) {
            if (values.length > 0) {
                const startIndex: number = values[0].startIndex;
                const afterEndIndex: number = values[values.length - 1].afterEndIndex;
                result = new Span(startIndex, afterEndIndex - startIndex);
            }
        }
        else {
            if (values.any()) {
                const startIndex: number = values.first().startIndex;
                const afterEndIndex: number = values.last().afterEndIndex;
                result = new Span(startIndex, afterEndIndex - startIndex);
            }
        }
    }

    return result;
}

/**
 * An object that has a getLength() method.
 */
export interface HasGetLength {
    getLength(): number;
}

/**
 * Get the combined length of the values in the provided array.
 */
export function getCombinedLength(values: HasGetLength[] | Iterable<HasGetLength> | Iterator<HasGetLength>): number {
    let result: number = 0;
    if (values) {
        if (values instanceof Array) {
            for (const value of values) {
                result += value.getLength();
            }
        }
        else {
            values.foreach((value: { getLength(): number }) => {
                result += value.getLength();
            });
        }
    }
    return result;
}

/**
 * A value that has startIndex and afterEndIndex properties.
 */
export interface HasStartIndexAndAfterEndIndex {
    startIndex: number;
    afterEndIndex: number;
}

/**
 * Get the combined length of the values in the provided array. This function assumes that the
 * values in the array don't have any gaps between them (the spans of the values are assumed to be
 * contiguous).
 */
export function getContiguousLength(values: HasStartIndexAndAfterEndIndex[] | Iterable<HasStartIndexAndAfterEndIndex>): number {
    let result: number;
    if (!values) {
        result = 0;
    }
    else {
        if (values instanceof Array) {
            result = values.length >= 1 ? values[values.length - 1].afterEndIndex - values[0].startIndex : 0;
        }
        else {
            result = values.any() ? values.last().afterEndIndex - values.first().startIndex : 0;
        }
    }
    return result;
}

/**
 * Get the combined text of the values in the provided array.
 */
export function getCombinedText(values: any[] | Iterable<any> | Iterator<any>): string {
    let result: string = "";
    if (values) {
        if (values instanceof Array) {
            for (const value of values) {
                result += value.toString();
            }
        }
        else {
            values.foreach((value: any) => {
                result += value.toString();
            })
        }
    }
    return result;
}

/**
 * Create a deep copy of the provided value.
 */
export function clone<T>(value: T): T {
    let result: any;

    if (value === null ||
        value === undefined ||
        typeof value === "boolean" ||
        typeof value === "number" ||
        typeof value === "string") {
        result = value;
    }
    else if (value instanceof Array) {
        result = cloneArray(value);
    }
    else {
        result = {};
        for (const propertyName in value) {
            result[propertyName] = clone(value[propertyName]);
        }
    }

    return result;
}

export function cloneArray<T>(values: T[]): T[] {
    let result: T[];
    if (values === undefined) {
        result = undefined;
    }
    else if (values === null) {
        result = null;
    }
    else {
        result = [];
        for (const index in values) {
            result[index] = clone(values[index]);
        }
    }
    return result;
}

/**
 * Find the nearest package.json file by looking in the current directory and each of its
 * parent directories.
 */
export function getPackageJson(): any {
    const fileName: string = "package.json";
    let parentPath: string = __dirname;

    let packageJson: any = null;

    let packageJsonFilePath: string = "";
    while (parentPath && !packageJson) {
        const packageJsonFilePath: string = path.join(parentPath, fileName);
        if (fs.existsSync(packageJsonFilePath)) {
            packageJson = JSON.parse(fs.readFileSync(packageJsonFilePath, "utf-8"));
        }
        else {
            parentPath = path.dirname(parentPath);
        }
    }

    return packageJson
}

/**
 * A one-dimensional span object.
 */
export class Span {
    constructor(private _startIndex: number, private _length: number) {
    }

    /**
     * The inclusive index at which this Span starts.
     */
    public get startIndex(): number {
        return this._startIndex;
    }

    /**
     * The length/number of indexes that this Span encompasses.
     */
    public get length(): number {
        return this._length;
    }

    /**
     * The last index that is contained by this span.
     */
    public get endIndex(): number {
        return this.afterEndIndex - 1;
    }

    /**
     * The first index after this span that is not contained by this span.
     */
    public get afterEndIndex(): number {
        return this.startIndex + this.length;
    }

    /**
     * Convert this Span to its string representation.
     */
    public toString(): string {
        return `[${this.startIndex},${this.afterEndIndex})`;
    }
}

/**
 * The different types of lexes.
 */
export const enum LexType {
    LeftCurlyBracket,
    RightCurlyBracket,
    LeftSquareBracket,
    RightSquareBracket,
    LeftAngleBracket,
    RightAngleBracket,
    LeftParenthesis,
    RightParenthesis,
    Letters,
    SingleQuote,
    DoubleQuote,
    Digits,
    Comma,
    Colon,
    Semicolon,
    ExclamationPoint,
    Backslash,
    ForwardSlash,
    QuestionMark,
    Dash,
    Plus,
    EqualsSign,
    Period,
    Underscore,
    Ampersand,
    VerticalBar,
    Space,
    Tab,
    CarriageReturn,
    NewLine,
    CarriageReturnNewLine,
    Asterisk,
    Percent,
    Hash,
    Unrecognized
}

/**
 * An individual lex from a lexer.
 */
export class Lex {
    constructor(private _text: string, private _startIndex: number, private _type: LexType) {
    }

    /**
     * The character index that this lex begins on.
     */
    public get startIndex(): number {
        return this._startIndex;
    }

    public get afterEndIndex(): number {
        return this._startIndex + this.getLength();
    }

    public get span(): Span {
        return new Span(this._startIndex, this.getLength());
    }

    /**
     * The string value for this token.
     */
    public toString(): string {
        return this._text;
    }

    /**
     * The length of the text of this token.
     */
    public getLength(): number {
        return this._text.length;
    }

    /**
     * The type of this token.
     */
    public getType(): LexType {
        return this._type;
    }

    public isWhitespace(): boolean {
        switch (this._type) {
            case LexType.Space:
            case LexType.Tab:
            case LexType.CarriageReturn:
                return true;

            default:
                return false;
        }
    }

    public isNewLine(): boolean {
        switch (this._type) {
            case LexType.CarriageReturnNewLine:
            case LexType.NewLine:
                return true;

            default:
                return false;
        }
    }
}

export function LeftCurlyBracket(startIndex: number): Lex {
    return new Lex("{", startIndex, LexType.LeftCurlyBracket);
}

export function RightCurlyBracket(startIndex: number): Lex {
    return new Lex("}", startIndex, LexType.RightCurlyBracket);
}

export function LeftSquareBracket(startIndex: number): Lex {
    return new Lex("[", startIndex, LexType.LeftSquareBracket);
}

export function RightSquareBracket(startIndex: number): Lex {
    return new Lex("]", startIndex, LexType.RightSquareBracket);
}

export function LeftAngleBracket(startIndex: number): Lex {
    return new Lex("<", startIndex, LexType.LeftAngleBracket);
}

export function RightAngleBracket(startIndex: number): Lex {
    return new Lex(">", startIndex, LexType.RightAngleBracket);
}

export function LeftParenthesis(startIndex: number): Lex {
    return new Lex("(", startIndex, LexType.LeftParenthesis);
}

export function RightParenthesis(startIndex: number): Lex {
    return new Lex(")", startIndex, LexType.RightParenthesis);
}

export function SingleQuote(startIndex: number): Lex {
    return new Lex("'", startIndex, LexType.SingleQuote);
}

export function DoubleQuote(startIndex: number): Lex {
    return new Lex("\"", startIndex, LexType.DoubleQuote);
}

export function Comma(startIndex: number): Lex {
    return new Lex(",", startIndex, LexType.Comma);
}

export function Colon(startIndex: number): Lex {
    return new Lex(":", startIndex, LexType.Colon);
}

export function Semicolon(startIndex: number): Lex {
    return new Lex(";", startIndex, LexType.Semicolon);
}

export function ExclamationPoint(startIndex: number): Lex {
    return new Lex("!", startIndex, LexType.ExclamationPoint);
}

export function Backslash(startIndex: number): Lex {
    return new Lex("\\", startIndex, LexType.Backslash);
}

export function ForwardSlash(startIndex: number): Lex {
    return new Lex("/", startIndex, LexType.ForwardSlash);
}

export function QuestionMark(startIndex: number): Lex {
    return new Lex("?", startIndex, LexType.QuestionMark);
}

export function Dash(startIndex: number): Lex {
    return new Lex("-", startIndex, LexType.Dash);
}

export function Plus(startIndex: number): Lex {
    return new Lex("+", startIndex, LexType.Plus);
}

export function EqualsSign(startIndex: number): Lex {
    return new Lex("=", startIndex, LexType.EqualsSign);
}

export function Period(startIndex: number): Lex {
    return new Lex(".", startIndex, LexType.Period);
}

export function Underscore(startIndex: number): Lex {
    return new Lex("_", startIndex, LexType.Underscore);
}

export function Ampersand(startIndex: number): Lex {
    return new Lex("&", startIndex, LexType.Ampersand);
}

export function VerticalBar(startIndex: number): Lex {
    return new Lex("|", startIndex, LexType.VerticalBar);
}

export function Space(startIndex: number): Lex {
    return new Lex(" ", startIndex, LexType.Space);
}

export function Tab(startIndex: number): Lex {
    return new Lex("\t", startIndex, LexType.Tab);
}

export function CarriageReturn(startIndex: number): Lex {
    return new Lex("\r", startIndex, LexType.CarriageReturn);
}

export function NewLine(startIndex: number): Lex {
    return new Lex("\n", startIndex, LexType.NewLine);
}

export function CarriageReturnNewLine(startIndex: number): Lex {
    return new Lex("\r\n", startIndex, LexType.NewLine);
}

export function Asterisk(startIndex: number): Lex {
    return new Lex("*", startIndex, LexType.Asterisk);
}

export function Percent(startIndex: number): Lex {
    return new Lex("%", startIndex, LexType.Percent);
}

export function Hash(startIndex: number): Lex {
    return new Lex("#", startIndex, LexType.Hash);
}

export function Letters(text: string, startIndex: number): Lex {
    return new Lex(text, startIndex, LexType.Letters);
}

export function Digits(text: string, startIndex: number): Lex {
    return new Lex(text, startIndex, LexType.Digits);
}

/**
 * Create an unrecognized token with the provided character string.
 */
export function Unrecognized(character: string, startIndex: number): Lex {
    return new Lex(character, startIndex, LexType.Unrecognized);
}

/**
 * A lexer that will break up a character stream into a stream of lexes.
 */
export class Lexer extends IteratorBase<Lex> {
    private _iterator: StringIterator;
    private _characterStartIndexOffset: number;

    private _currentLex: Lex;

    constructor(text: string, startIndex: number = 0) {
        super();

        this._iterator = new StringIterator(text);
        this._characterStartIndexOffset = startIndex;
    }

    /**
     * Whether this object has started tokenizing its input stream or not.
     */
    public hasStarted(): boolean {
        return this._iterator.hasStarted();
    }

    /**
     * Get whether this tokenizer has a current token or not.
     */
    public hasCurrent(): boolean {
        return isDefined(this._currentLex);
    }

    /**
     * The current lex that has been lexed from the source character stream.
     */
    public getCurrent(): Lex {
        return this._currentLex;
    }

    private getCurrentCharacterStartIndex(): number {
        return this._iterator.currentIndex + this._characterStartIndexOffset;
    }

    private hasCurrentCharacter(): boolean {
        return this._iterator.hasCurrent();
    }

    private getCurrentCharacter(): string {
        return this._iterator.getCurrent();
    }

    private nextCharacter(): boolean {
        return this._iterator.next();
    }

    /**
     * Get the next lex in the stream.
     */
    public next(): boolean {
        if (!this.hasStarted()) {
            this.nextCharacter();
        }

        if (this.hasCurrentCharacter()) {
            const currentLexStartIndex: number = this.getCurrentCharacterStartIndex();
            switch (this.getCurrentCharacter()) {
                case "{":
                    this._currentLex = LeftCurlyBracket(currentLexStartIndex);
                    this.nextCharacter();
                    break;

                case "}":
                    this._currentLex = RightCurlyBracket(currentLexStartIndex);
                    this.nextCharacter();
                    break;

                case "[":
                    this._currentLex = LeftSquareBracket(currentLexStartIndex);
                    this.nextCharacter();
                    break;

                case "]":
                    this._currentLex = RightSquareBracket(currentLexStartIndex);
                    this.nextCharacter();
                    break;

                case "(":
                    this._currentLex = LeftParenthesis(currentLexStartIndex);
                    this.nextCharacter();
                    break;

                case ")":
                    this._currentLex = RightParenthesis(currentLexStartIndex);
                    this.nextCharacter();
                    break;

                case "<":
                    this._currentLex = LeftAngleBracket(currentLexStartIndex);
                    this.nextCharacter();
                    break;

                case ">":
                    this._currentLex = RightAngleBracket(currentLexStartIndex);
                    this.nextCharacter();
                    break;

                case `"`:
                    this._currentLex = DoubleQuote(currentLexStartIndex);
                    this.nextCharacter();
                    break;

                case `'`:
                    this._currentLex = SingleQuote(currentLexStartIndex);
                    this.nextCharacter();
                    break;

                case "-":
                    this._currentLex = Dash(currentLexStartIndex);
                    this.nextCharacter();
                    break;

                case "+":
                    this._currentLex = Plus(currentLexStartIndex);
                    this.nextCharacter();
                    break;

                case ",":
                    this._currentLex = Comma(currentLexStartIndex);
                    this.nextCharacter();
                    break;

                case ":":
                    this._currentLex = Colon(currentLexStartIndex);
                    this.nextCharacter();
                    break;

                case ";":
                    this._currentLex = Semicolon(currentLexStartIndex);
                    this.nextCharacter();
                    break;

                case "!":
                    this._currentLex = ExclamationPoint(currentLexStartIndex);
                    this.nextCharacter();
                    break;

                case "\\":
                    this._currentLex = Backslash(currentLexStartIndex);
                    this.nextCharacter();
                    break;

                case "/":
                    this._currentLex = ForwardSlash(currentLexStartIndex);
                    this.nextCharacter();
                    break;

                case "?":
                    this._currentLex = QuestionMark(currentLexStartIndex);
                    this.nextCharacter();
                    break;

                case "=":
                    this._currentLex = EqualsSign(currentLexStartIndex);
                    this.nextCharacter();
                    break;

                case ".":
                    this._currentLex = Period(currentLexStartIndex);
                    this.nextCharacter();
                    break;

                case "_":
                    this._currentLex = Underscore(currentLexStartIndex);
                    this.nextCharacter();
                    break;

                case "&":
                    this._currentLex = Ampersand(currentLexStartIndex);
                    this.nextCharacter();
                    break;

                case " ":
                    this._currentLex = Space(currentLexStartIndex);
                    this.nextCharacter();
                    break;

                case "\t":
                    this._currentLex = Tab(currentLexStartIndex);
                    this.nextCharacter();
                    break;

                case "\r":
                    if (!this.nextCharacter() || this.getCurrentCharacter() !== "\n") {
                        this._currentLex = CarriageReturn(currentLexStartIndex);
                    }
                    else {
                        this._currentLex = CarriageReturnNewLine(currentLexStartIndex);
                        this.nextCharacter();
                    }
                    break;

                case "\n":
                    this._currentLex = NewLine(currentLexStartIndex);
                    this.nextCharacter();
                    break;

                case "*":
                    this._currentLex = Asterisk(currentLexStartIndex);
                    this.nextCharacter();
                    break;

                case "%":
                    this._currentLex = Percent(currentLexStartIndex);
                    this.nextCharacter();
                    break;

                case "|":
                    this._currentLex = VerticalBar(currentLexStartIndex);
                    this.nextCharacter();
                    break;

                case "#":
                    this._currentLex = Hash(currentLexStartIndex);
                    this.nextCharacter();
                    break;

                default:
                    if (isLetter(this.getCurrentCharacter())) {
                        this._currentLex = Letters(readLetters(this._iterator), currentLexStartIndex);
                    }
                    else if (isDigit(this.getCurrentCharacter())) {
                        this._currentLex = Digits(readDigits(this._iterator), currentLexStartIndex);
                    }
                    else {
                        this._currentLex = Unrecognized(this.getCurrentCharacter(), currentLexStartIndex);
                        this.nextCharacter();
                    }
                    break;
            }
        }
        else {
            this._currentLex = undefined;
        }

        return this.hasCurrent();
    }
}

export function readWhile(iterator: Iterator<string>, condition: (character: string) => boolean): string {
    let result: string = iterator.getCurrent();

    while (iterator.next() && condition(iterator.getCurrent())) {
        result += iterator.getCurrent();
    }

    return result;
}

export function readLetters(iterator: Iterator<string>): string {
    return readWhile(iterator, isLetter);
}

export function readSpacesAndTabs(iterator: Iterator<string>): string {
    return readWhile(iterator, isSpaceOrTab);
}

export function readDigits(iterator: Iterator<string>): string {
    return readWhile(iterator, isDigit);
}

export function isSpaceOrTab(value: string): boolean {
    return value === " " || value === "\t";
}

/**
 * Is the provided character a letter?
 */
export function isLetter(character: string): boolean {
    return        ("\u0041" <= character && character <= "\u0059")
    || (character >= "\u0061" && ("\u0061" <= character && character <= "\u0079")
    || (character >= "\u00AA" && ("\u00AA" <= character && character <= "\u00AA")
    || (character >= "\u00BA" && ("\u00BA" <= character && character <= "\u00D5")
    || (character >= "\u00D8" && ("\u00D8" <= character && character <= "\u00F5")
    || (character >= "\u00F8" && ("\u00F8" <= character && character <= "\u02C0")
    || (character >= "\u02C6" && ("\u02C6" <= character && character <= "\u02D0")
    || (character >= "\u02E0" && ("\u02E0" <= character && character <= "\u02E3")
    || (character >= "\u02EC" && ("\u02EC" <= character && character <= "\u02EC")
    || (character >= "\u0370" && ("\u0370" <= character && character <= "\u0373")
    || (character >= "\u0376" && ("\u0376" <= character && character <= "\u0376")
    || (character >= "\u037A" && ("\u037A" <= character && character <= "\u037C")
    || (character >= "\u037F" && ("\u037F" <= character && character <= "\u037F")
    || (character >= "\u0388" && ("\u0388" <= character && character <= "\u0389")
    || (character >= "\u038C" && ("\u038C" <= character && character <= "\u03A0")
    || (character >= "\u03A3" && ("\u03A3" <= character && character <= "\u03F4")
    || (character >= "\u03F7" && ("\u03F7" <= character && character <= "\u0480")
    || (character >= "\u048A" && ("\u048A" <= character && character <= "\u052E")
    || (character >= "\u0531" && ("\u0531" <= character && character <= "\u0555")
    || (character >= "\u0559" && ("\u0559" <= character && character <= "\u0586")
    || (character >= "\u05D0" && ("\u05D0" <= character && character <= "\u05E9")
    || (character >= "\u05F0" && ("\u05F0" <= character && character <= "\u05F1")
    || (character >= "\u0620" && ("\u0620" <= character && character <= "\u0649")
    || (character >= "\u066E" && ("\u066E" <= character && character <= "\u066E")
    || (character >= "\u0671" && ("\u0671" <= character && character <= "\u06D2")
    || (character >= "\u06D5" && ("\u06D5" <= character && character <= "\u06E5")
    || (character >= "\u06EE" && ("\u06EE" <= character && character <= "\u06EE")
    || (character >= "\u06FA" && ("\u06FA" <= character && character <= "\u06FB")
    || (character >= "\u06FF" && ("\u06FF" <= character && character <= "\u06FF")
    || (character >= "\u0712" && ("\u0712" <= character && character <= "\u072E")
    || (character >= "\u074D" && ("\u074D" <= character && character <= "\u07A4")
    || (character >= "\u07B1" && ("\u07B1" <= character && character <= "\u07E9")
    || (character >= "\u07F4" && ("\u07F4" <= character && character <= "\u07F4")
    || (character >= "\u07FA" && ("\u07FA" <= character && character <= "\u0814")
    || (character >= "\u081A" && ("\u081A" <= character && character <= "\u081A")
    || (character >= "\u0828" && ("\u0828" <= character && character <= "\u0857")
    || (character >= "\u0860" && ("\u0860" <= character && character <= "\u0869")
    || (character >= "\u08A0" && ("\u08A0" <= character && character <= "\u08B3")
    || (character >= "\u08B6" && ("\u08B6" <= character && character <= "\u08BC")
    || (character >= "\u0904" && ("\u0904" <= character && character <= "\u0938")
    || (character >= "\u093D" && ("\u093D" <= character && character <= "\u093D")
    || (character >= "\u0958" && ("\u0958" <= character && character <= "\u0960")
    || (character >= "\u0971" && ("\u0971" <= character && character <= "\u097F")
    || (character >= "\u0985" && ("\u0985" <= character && character <= "\u098B")
    || (character >= "\u098F" && ("\u098F" <= character && character <= "\u098F")
    || (character >= "\u0993" && ("\u0993" <= character && character <= "\u09A7")
    || (character >= "\u09AA" && ("\u09AA" <= character && character <= "\u09AF")
    || (character >= "\u09B2" && ("\u09B2" <= character && character <= "\u09B8")
    || (character >= "\u09BD" && ("\u09BD" <= character && character <= "\u09BD")
    || (character >= "\u09DC" && ("\u09DC" <= character && character <= "\u09DC")
    || (character >= "\u09DF" && ("\u09DF" <= character && character <= "\u09E0")
    || (character >= "\u09F0" && ("\u09F0" <= character && character <= "\u09F0")
    || (character >= "\u09FC" && ("\u09FC" <= character && character <= "\u0A09")
    || (character >= "\u0A0F" && ("\u0A0F" <= character && character <= "\u0A0F")
    || (character >= "\u0A13" && ("\u0A13" <= character && character <= "\u0A27")
    || (character >= "\u0A2A" && ("\u0A2A" <= character && character <= "\u0A2F")
    || (character >= "\u0A32" && ("\u0A32" <= character && character <= "\u0A32")
    || (character >= "\u0A35" && ("\u0A35" <= character && character <= "\u0A35")
    || (character >= "\u0A38" && ("\u0A38" <= character && character <= "\u0A38")
    || (character >= "\u0A59" && ("\u0A59" <= character && character <= "\u0A5B")
    || (character >= "\u0A5E" && ("\u0A5E" <= character && character <= "\u0A73")
    || (character >= "\u0A85" && ("\u0A85" <= character && character <= "\u0A8C")
    || (character >= "\u0A8F" && ("\u0A8F" <= character && character <= "\u0A90")
    || (character >= "\u0A93" && ("\u0A93" <= character && character <= "\u0AA7")
    || (character >= "\u0AAA" && ("\u0AAA" <= character && character <= "\u0AAF")
    || (character >= "\u0AB2" && ("\u0AB2" <= character && character <= "\u0AB2")
    || (character >= "\u0AB5" && ("\u0AB5" <= character && character <= "\u0AB8")
    || (character >= "\u0ABD" && ("\u0ABD" <= character && character <= "\u0ABD")
    || (character >= "\u0AE0" && ("\u0AE0" <= character && character <= "\u0AE0")
    || (character >= "\u0AF9" && ("\u0AF9" <= character && character <= "\u0B0B")
    || (character >= "\u0B0F" && ("\u0B0F" <= character && character <= "\u0B0F")
    || (character >= "\u0B13" && ("\u0B13" <= character && character <= "\u0B27")
    || (character >= "\u0B2A" && ("\u0B2A" <= character && character <= "\u0B2F")
    || (character >= "\u0B32" && ("\u0B32" <= character && character <= "\u0B32")
    || (character >= "\u0B35" && ("\u0B35" <= character && character <= "\u0B38")
    || (character >= "\u0B3D" && ("\u0B3D" <= character && character <= "\u0B5C")
    || (character >= "\u0B5F" && ("\u0B5F" <= character && character <= "\u0B60")
    || (character >= "\u0B71" && ("\u0B71" <= character && character <= "\u0B71")
    || (character >= "\u0B85" && ("\u0B85" <= character && character <= "\u0B89")
    || (character >= "\u0B8E" && ("\u0B8E" <= character && character <= "\u0B8F")
    || (character >= "\u0B92" && ("\u0B92" <= character && character <= "\u0B94")
    || (character >= "\u0B99" && ("\u0B99" <= character && character <= "\u0B99")
    || (character >= "\u0B9C" && ("\u0B9C" <= character && character <= "\u0B9E")
    || (character >= "\u0BA3" && ("\u0BA3" <= character && character <= "\u0BA3")
    || (character >= "\u0BA8" && ("\u0BA8" <= character && character <= "\u0BA9")
    || (character >= "\u0BAE" && ("\u0BAE" <= character && character <= "\u0BB8")
    || (character >= "\u0BD0" && ("\u0BD0" <= character && character <= "\u0C0B")
    || (character >= "\u0C0E" && ("\u0C0E" <= character && character <= "\u0C0F")
    || (character >= "\u0C12" && ("\u0C12" <= character && character <= "\u0C27")
    || (character >= "\u0C2A" && ("\u0C2A" <= character && character <= "\u0C38")
    || (character >= "\u0C3D" && ("\u0C3D" <= character && character <= "\u0C59")
    || (character >= "\u0C60" && ("\u0C60" <= character && character <= "\u0C60")
    || (character >= "\u0C80" && ("\u0C80" <= character && character <= "\u0C8B")
    || (character >= "\u0C8E" && ("\u0C8E" <= character && character <= "\u0C8F")
    || (character >= "\u0C92" && ("\u0C92" <= character && character <= "\u0CA7")
    || (character >= "\u0CAA" && ("\u0CAA" <= character && character <= "\u0CB2")
    || (character >= "\u0CB5" && ("\u0CB5" <= character && character <= "\u0CB8")
    || (character >= "\u0CBD" && ("\u0CBD" <= character && character <= "\u0CBD")
    || (character >= "\u0CE0" && ("\u0CE0" <= character && character <= "\u0CE0")
    || (character >= "\u0CF1" && ("\u0CF1" <= character && character <= "\u0CF1")
    || (character >= "\u0D05" && ("\u0D05" <= character && character <= "\u0D0B")
    || (character >= "\u0D0E" && ("\u0D0E" <= character && character <= "\u0D0F")
    || (character >= "\u0D12" && ("\u0D12" <= character && character <= "\u0D39")
    || (character >= "\u0D3D" && ("\u0D3D" <= character && character <= "\u0D3D")
    || (character >= "\u0D54" && ("\u0D54" <= character && character <= "\u0D55")
    || (character >= "\u0D5F" && ("\u0D5F" <= character && character <= "\u0D60")
    || (character >= "\u0D7A" && ("\u0D7A" <= character && character <= "\u0D7E")
    || (character >= "\u0D85" && ("\u0D85" <= character && character <= "\u0D95")
    || (character >= "\u0D9A" && ("\u0D9A" <= character && character <= "\u0DB0")
    || (character >= "\u0DB3" && ("\u0DB3" <= character && character <= "\u0DBA")
    || (character >= "\u0DBD" && ("\u0DBD" <= character && character <= "\u0DC5")
    || (character >= "\u0E01" && ("\u0E01" <= character && character <= "\u0E2F")
    || (character >= "\u0E32" && ("\u0E32" <= character && character <= "\u0E32")
    || (character >= "\u0E40" && ("\u0E40" <= character && character <= "\u0E45")
    || (character >= "\u0E81" && ("\u0E81" <= character && character <= "\u0E81")
    || (character >= "\u0E84" && ("\u0E84" <= character && character <= "\u0E87")
    || (character >= "\u0E8A" && ("\u0E8A" <= character && character <= "\u0E8A")
    || (character >= "\u0E94" && ("\u0E94" <= character && character <= "\u0E96")
    || (character >= "\u0E99" && ("\u0E99" <= character && character <= "\u0E9E")
    || (character >= "\u0EA1" && ("\u0EA1" <= character && character <= "\u0EA2")
    || (character >= "\u0EA5" && ("\u0EA5" <= character && character <= "\u0EA5")
    || (character >= "\u0EAA" && ("\u0EAA" <= character && character <= "\u0EAA")
    || (character >= "\u0EAD" && ("\u0EAD" <= character && character <= "\u0EAF")
    || (character >= "\u0EB2" && ("\u0EB2" <= character && character <= "\u0EB2")
    || (character >= "\u0EBD" && ("\u0EBD" <= character && character <= "\u0EC3")
    || (character >= "\u0EC6" && ("\u0EC6" <= character && character <= "\u0EDE")
    || (character >= "\u0F00" && ("\u0F00" <= character && character <= "\u0F46")
    || (character >= "\u0F49" && ("\u0F49" <= character && character <= "\u0F6B")
    || (character >= "\u0F88" && ("\u0F88" <= character && character <= "\u0F8B")
    || (character >= "\u1000" && ("\u1000" <= character && character <= "\u1029")
    || (character >= "\u103F" && ("\u103F" <= character && character <= "\u1054")
    || (character >= "\u105A" && ("\u105A" <= character && character <= "\u105C")
    || (character >= "\u1061" && ("\u1061" <= character && character <= "\u1065")
    || (character >= "\u106E" && ("\u106E" <= character && character <= "\u106F")
    || (character >= "\u1075" && ("\u1075" <= character && character <= "\u1080")
    || (character >= "\u108E" && ("\u108E" <= character && character <= "\u10C4")
    || (character >= "\u10C7" && ("\u10C7" <= character && character <= "\u10C7")
    || (character >= "\u10D0" && ("\u10D0" <= character && character <= "\u10F9")
    || (character >= "\u10FC" && ("\u10FC" <= character && character <= "\u1247")
    || (character >= "\u124A" && ("\u124A" <= character && character <= "\u124C")
    || (character >= "\u1250" && ("\u1250" <= character && character <= "\u1255")
    || (character >= "\u1258" && ("\u1258" <= character && character <= "\u125C")
    || (character >= "\u1260" && ("\u1260" <= character && character <= "\u1287")
    || (character >= "\u128A" && ("\u128A" <= character && character <= "\u128C")
    || (character >= "\u1290" && ("\u1290" <= character && character <= "\u12AF")
    || (character >= "\u12B2" && ("\u12B2" <= character && character <= "\u12B4")
    || (character >= "\u12B8" && ("\u12B8" <= character && character <= "\u12BD")
    || (character >= "\u12C0" && ("\u12C0" <= character && character <= "\u12C4")
    || (character >= "\u12C8" && ("\u12C8" <= character && character <= "\u12D5")
    || (character >= "\u12D8" && ("\u12D8" <= character && character <= "\u130F")
    || (character >= "\u1312" && ("\u1312" <= character && character <= "\u1314")
    || (character >= "\u1318" && ("\u1318" <= character && character <= "\u1359")
    || (character >= "\u1380" && ("\u1380" <= character && character <= "\u138E")
    || (character >= "\u13A0" && ("\u13A0" <= character && character <= "\u13F4")
    || (character >= "\u13F8" && ("\u13F8" <= character && character <= "\u13FC")
    || (character >= "\u1401" && ("\u1401" <= character && character <= "\u166B")
    || (character >= "\u166F" && ("\u166F" <= character && character <= "\u167E")
    || (character >= "\u1681" && ("\u1681" <= character && character <= "\u1699")
    || (character >= "\u16A0" && ("\u16A0" <= character && character <= "\u16E9")
    || (character >= "\u16F1" && ("\u16F1" <= character && character <= "\u16F7")
    || (character >= "\u1700" && ("\u1700" <= character && character <= "\u170B")
    || (character >= "\u170E" && ("\u170E" <= character && character <= "\u1710")
    || (character >= "\u1720" && ("\u1720" <= character && character <= "\u1730")
    || (character >= "\u1740" && ("\u1740" <= character && character <= "\u1750")
    || (character >= "\u1760" && ("\u1760" <= character && character <= "\u176B")
    || (character >= "\u176E" && ("\u176E" <= character && character <= "\u176F")
    || (character >= "\u1780" && ("\u1780" <= character && character <= "\u17B2")
    || (character >= "\u17D7" && ("\u17D7" <= character && character <= "\u17D7")
    || (character >= "\u1820" && ("\u1820" <= character && character <= "\u1876")
    || (character >= "\u1880" && ("\u1880" <= character && character <= "\u1883")
    || (character >= "\u1887" && ("\u1887" <= character && character <= "\u18A7")
    || (character >= "\u18AA" && ("\u18AA" <= character && character <= "\u18F4")
    || (character >= "\u1900" && ("\u1900" <= character && character <= "\u191D")
    || (character >= "\u1950" && ("\u1950" <= character && character <= "\u196C")
    || (character >= "\u1970" && ("\u1970" <= character && character <= "\u1973")
    || (character >= "\u1980" && ("\u1980" <= character && character <= "\u19AA")
    || (character >= "\u19B0" && ("\u19B0" <= character && character <= "\u19C8")
    || (character >= "\u1A00" && ("\u1A00" <= character && character <= "\u1A15")
    || (character >= "\u1A20" && ("\u1A20" <= character && character <= "\u1A53")
    || (character >= "\u1AA7" && ("\u1AA7" <= character && character <= "\u1B32")
    || (character >= "\u1B45" && ("\u1B45" <= character && character <= "\u1B4A")
    || (character >= "\u1B83" && ("\u1B83" <= character && character <= "\u1B9F")
    || (character >= "\u1BAE" && ("\u1BAE" <= character && character <= "\u1BAE")
    || (character >= "\u1BBA" && ("\u1BBA" <= character && character <= "\u1BE4")
    || (character >= "\u1C00" && ("\u1C00" <= character && character <= "\u1C22")
    || (character >= "\u1C4D" && ("\u1C4D" <= character && character <= "\u1C4E")
    || (character >= "\u1C5A" && ("\u1C5A" <= character && character <= "\u1C7C")
    || (character >= "\u1C80" && ("\u1C80" <= character && character <= "\u1C87")
    || (character >= "\u1CE9" && ("\u1CE9" <= character && character <= "\u1CEB")
    || (character >= "\u1CEE" && ("\u1CEE" <= character && character <= "\u1CF0")
    || (character >= "\u1CF5" && ("\u1CF5" <= character && character <= "\u1CF5")
    || (character >= "\u1D00" && ("\u1D00" <= character && character <= "\u1DBE")
    || (character >= "\u1E00" && ("\u1E00" <= character && character <= "\u1F14")
    || (character >= "\u1F18" && ("\u1F18" <= character && character <= "\u1F1C")
    || (character >= "\u1F20" && ("\u1F20" <= character && character <= "\u1F44")
    || (character >= "\u1F48" && ("\u1F48" <= character && character <= "\u1F4C")
    || (character >= "\u1F50" && ("\u1F50" <= character && character <= "\u1F56")
    || (character >= "\u1F59" && ("\u1F59" <= character && character <= "\u1F59")
    || (character >= "\u1F5D" && ("\u1F5D" <= character && character <= "\u1F7C")
    || (character >= "\u1F80" && ("\u1F80" <= character && character <= "\u1FB3")
    || (character >= "\u1FB6" && ("\u1FB6" <= character && character <= "\u1FBB")
    || (character >= "\u1FBE" && ("\u1FBE" <= character && character <= "\u1FC3")
    || (character >= "\u1FC6" && ("\u1FC6" <= character && character <= "\u1FCB")
    || (character >= "\u1FD0" && ("\u1FD0" <= character && character <= "\u1FD2")
    || (character >= "\u1FD6" && ("\u1FD6" <= character && character <= "\u1FDA")
    || (character >= "\u1FE0" && ("\u1FE0" <= character && character <= "\u1FEB")
    || (character >= "\u1FF2" && ("\u1FF2" <= character && character <= "\u1FF3")
    || (character >= "\u1FF6" && ("\u1FF6" <= character && character <= "\u1FFB")
    || (character >= "\u2071" && ("\u2071" <= character && character <= "\u2071")
    || (character >= "\u2090" && ("\u2090" <= character && character <= "\u209B")
    || (character >= "\u2102" && ("\u2102" <= character && character <= "\u2102")
    || (character >= "\u210A" && ("\u210A" <= character && character <= "\u2112")
    || (character >= "\u2115" && ("\u2115" <= character && character <= "\u211C")
    || (character >= "\u2124" && ("\u2124" <= character && character <= "\u2124")
    || (character >= "\u2128" && ("\u2128" <= character && character <= "\u212C")
    || (character >= "\u212F" && ("\u212F" <= character && character <= "\u2138")
    || (character >= "\u213C" && ("\u213C" <= character && character <= "\u213E")
    || (character >= "\u2145" && ("\u2145" <= character && character <= "\u2148")
    || (character >= "\u214E" && ("\u214E" <= character && character <= "\u2183")
    || (character >= "\u2C00" && ("\u2C00" <= character && character <= "\u2C2D")
    || (character >= "\u2C30" && ("\u2C30" <= character && character <= "\u2C5D")
    || (character >= "\u2C60" && ("\u2C60" <= character && character <= "\u2CE3")
    || (character >= "\u2CEB" && ("\u2CEB" <= character && character <= "\u2CED")
    || (character >= "\u2CF2" && ("\u2CF2" <= character && character <= "\u2CF2")
    || (character >= "\u2D00" && ("\u2D00" <= character && character <= "\u2D24")
    || (character >= "\u2D27" && ("\u2D27" <= character && character <= "\u2D27")
    || (character >= "\u2D30" && ("\u2D30" <= character && character <= "\u2D66")
    || (character >= "\u2D6F" && ("\u2D6F" <= character && character <= "\u2D95")
    || (character >= "\u2DA0" && ("\u2DA0" <= character && character <= "\u2DA5")
    || (character >= "\u2DA8" && ("\u2DA8" <= character && character <= "\u2DAD")
    || (character >= "\u2DB0" && ("\u2DB0" <= character && character <= "\u2DB5")
    || (character >= "\u2DB8" && ("\u2DB8" <= character && character <= "\u2DBD")
    || (character >= "\u2DC0" && ("\u2DC0" <= character && character <= "\u2DC5")
    || (character >= "\u2DC8" && ("\u2DC8" <= character && character <= "\u2DCD")
    || (character >= "\u2DD0" && ("\u2DD0" <= character && character <= "\u2DD5")
    || (character >= "\u2DD8" && ("\u2DD8" <= character && character <= "\u2DDD")
    || (character >= "\u2E2F" && ("\u2E2F" <= character && character <= "\u3005")
    || (character >= "\u3031" && ("\u3031" <= character && character <= "\u3034")
    || (character >= "\u303B" && ("\u303B" <= character && character <= "\u303B")
    || (character >= "\u3041" && ("\u3041" <= character && character <= "\u3095")
    || (character >= "\u309D" && ("\u309D" <= character && character <= "\u309E")
    || (character >= "\u30A1" && ("\u30A1" <= character && character <= "\u30F9")
    || (character >= "\u30FC" && ("\u30FC" <= character && character <= "\u30FE")
    || (character >= "\u3105" && ("\u3105" <= character && character <= "\u312D")
    || (character >= "\u3131" && ("\u3131" <= character && character <= "\u318D")
    || (character >= "\u31A0" && ("\u31A0" <= character && character <= "\u31B9")
    || (character >= "\u31F0" && ("\u31F0" <= character && character <= "\u31FE")
    || (character >= "\u3400" && ("\u3400" <= character && character <= "\u3400")
    || (character >= "\u4E00" && ("\u4E00" <= character && character <= "\u4E00")
    || (character >= "\uA000" && ("\uA000" <= character && character <= "\uA48B")
    || (character >= "\uA4D0" && ("\uA4D0" <= character && character <= "\uA4FC")
    || (character >= "\uA500" && ("\uA500" <= character && character <= "\uA60B")
    || (character >= "\uA610" && ("\uA610" <= character && character <= "\uA61E")
    || (character >= "\uA62A" && ("\uA62A" <= character && character <= "\uA62A")
    || (character >= "\uA640" && ("\uA640" <= character && character <= "\uA66D")
    || (character >= "\uA67F" && ("\uA67F" <= character && character <= "\uA69C")
    || (character >= "\uA6A0" && ("\uA6A0" <= character && character <= "\uA6E4")
    || (character >= "\uA717" && ("\uA717" <= character && character <= "\uA71E")
    || (character >= "\uA722" && ("\uA722" <= character && character <= "\uA787")
    || (character >= "\uA78B" && ("\uA78B" <= character && character <= "\uA7AD")
    || (character >= "\uA7B0" && ("\uA7B0" <= character && character <= "\uA7B6")
    || (character >= "\uA7F7" && ("\uA7F7" <= character && character <= "\uA800")
    || (character >= "\uA803" && ("\uA803" <= character && character <= "\uA804")
    || (character >= "\uA807" && ("\uA807" <= character && character <= "\uA809")
    || (character >= "\uA80C" && ("\uA80C" <= character && character <= "\uA821")
    || (character >= "\uA840" && ("\uA840" <= character && character <= "\uA872")
    || (character >= "\uA882" && ("\uA882" <= character && character <= "\uA8B2")
    || (character >= "\uA8F2" && ("\uA8F2" <= character && character <= "\uA8F6")
    || (character >= "\uA8FB" && ("\uA8FB" <= character && character <= "\uA8FB")
    || (character >= "\uA90A" && ("\uA90A" <= character && character <= "\uA924")
    || (character >= "\uA930" && ("\uA930" <= character && character <= "\uA945")
    || (character >= "\uA960" && ("\uA960" <= character && character <= "\uA97B")
    || (character >= "\uA984" && ("\uA984" <= character && character <= "\uA9B1")
    || (character >= "\uA9CF" && ("\uA9CF" <= character && character <= "\uA9E3")
    || (character >= "\uA9E6" && ("\uA9E6" <= character && character <= "\uA9EE")
    || (character >= "\uA9FA" && ("\uA9FA" <= character && character <= "\uA9FD")
    || (character >= "\uAA00" && ("\uAA00" <= character && character <= "\uAA27")
    || (character >= "\uAA40" && ("\uAA40" <= character && character <= "\uAA41")
    || (character >= "\uAA44" && ("\uAA44" <= character && character <= "\uAA4A")
    || (character >= "\uAA60" && ("\uAA60" <= character && character <= "\uAA75")
    || (character >= "\uAA7A" && ("\uAA7A" <= character && character <= "\uAAAE")
    || (character >= "\uAAB1" && ("\uAAB1" <= character && character <= "\uAAB5")
    || (character >= "\uAAB9" && ("\uAAB9" <= character && character <= "\uAABC")
    || (character >= "\uAAC0" && ("\uAAC0" <= character && character <= "\uAAC0")
    || (character >= "\uAADB" && ("\uAADB" <= character && character <= "\uAADC")
    || (character >= "\uAAE0" && ("\uAAE0" <= character && character <= "\uAAE9")
    || (character >= "\uAAF2" && ("\uAAF2" <= character && character <= "\uAAF3")
    || (character >= "\uAB01" && ("\uAB01" <= character && character <= "\uAB05")
    || (character >= "\uAB09" && ("\uAB09" <= character && character <= "\uAB0D")
    || (character >= "\uAB11" && ("\uAB11" <= character && character <= "\uAB15")
    || (character >= "\uAB20" && ("\uAB20" <= character && character <= "\uAB25")
    || (character >= "\uAB28" && ("\uAB28" <= character && character <= "\uAB2D")
    || (character >= "\uAB30" && ("\uAB30" <= character && character <= "\uAB59")
    || (character >= "\uAB5C" && ("\uAB5C" <= character && character <= "\uAB64")
    || (character >= "\uAB70" && ("\uAB70" <= character && character <= "\uABE1")
    || (character >= "\uAC00" && ("\uAC00" <= character && character <= "\uAC00")
    || (character >= "\uD7B0" && ("\uD7B0" <= character && character <= "\uD7C5")
    || (character >= "\uD7CB" && ("\uD7CB" <= character && character <= "\uD7FA")
    || (character >= "\uF900" && ("\uF900" <= character && character <= "\uFA6C")
    || (character >= "\uFA70" && ("\uFA70" <= character && character <= "\uFAD8")
    || (character >= "\uFB00" && ("\uFB00" <= character && character <= "\uFB05")
    || (character >= "\uFB13" && ("\uFB13" <= character && character <= "\uFB16")
    || (character >= "\uFB1D" && ("\uFB1D" <= character && character <= "\uFB27")
    || (character >= "\uFB2A" && ("\uFB2A" <= character && character <= "\uFB35")
    || (character >= "\uFB38" && ("\uFB38" <= character && character <= "\uFB3B")
    || (character >= "\uFB3E" && ("\uFB3E" <= character && character <= "\uFB40")
    || (character >= "\uFB43" && ("\uFB43" <= character && character <= "\uFB43")
    || (character >= "\uFB46" && ("\uFB46" <= character && character <= "\uFBB0")
    || (character >= "\uFBD3" && ("\uFBD3" <= character && character <= "\uFD3C")
    || (character >= "\uFD50" && ("\uFD50" <= character && character <= "\uFD8E")
    || (character >= "\uFD92" && ("\uFD92" <= character && character <= "\uFDC6")
    || (character >= "\uFDF0" && ("\uFDF0" <= character && character <= "\uFDFA")
    || (character >= "\uFE70" && ("\uFE70" <= character && character <= "\uFE73")
    || (character >= "\uFE76" && ("\uFE76" <= character && character <= "\uFEFB")
    || (character >= "\uFF21" && ("\uFF21" <= character && character <= "\uFF39")
    || (character >= "\uFF41" && ("\uFF41" <= character && character <= "\uFF59")
    || (character >= "\uFF66" && ("\uFF66" <= character && character <= "\uFFBD")
    || (character >= "\uFFC2" && ("\uFFC2" <= character && character <= "\uFFC6")
    || (character >= "\uFFCA" && ("\uFFCA" <= character && character <= "\uFFCE")
    || (character >= "\uFFD2" && ("\uFFD2" <= character && character <= "\uFFD6")
    || (character >= "\uFFDA" && ("\uFFDA" <= character && character <= "\uFFDB")
    || (character >= "\u10000" && ("\u10000" <= character && character <= "\u1000A")
    || (character >= "\u1000D" && ("\u1000D" <= character && character <= "\u10025")
    || (character >= "\u10028" && ("\u10028" <= character && character <= "\u10039")
    || (character >= "\u1003C" && ("\u1003C" <= character && character <= "\u1003C")
    || (character >= "\u1003F" && ("\u1003F" <= character && character <= "\u1004C")
    || (character >= "\u10050" && ("\u10050" <= character && character <= "\u1005C")
    || (character >= "\u10080" && ("\u10080" <= character && character <= "\u100F9")
    || (character >= "\u10280" && ("\u10280" <= character && character <= "\u1029B")
    || (character >= "\u102A0" && ("\u102A0" <= character && character <= "\u102CF")
    || (character >= "\u10300" && ("\u10300" <= character && character <= "\u1031E")
    || (character >= "\u1032D" && ("\u1032D" <= character && character <= "\u1033F")
    || (character >= "\u10342" && ("\u10342" <= character && character <= "\u10348")
    || (character >= "\u10350" && ("\u10350" <= character && character <= "\u10374")
    || (character >= "\u10380" && ("\u10380" <= character && character <= "\u1039C")
    || (character >= "\u103A0" && ("\u103A0" <= character && character <= "\u103C2")
    || (character >= "\u103C8" && ("\u103C8" <= character && character <= "\u103CE")
    || (character >= "\u10400" && ("\u10400" <= character && character <= "\u1049C")
    || (character >= "\u104B0" && ("\u104B0" <= character && character <= "\u104D2")
    || (character >= "\u104D8" && ("\u104D8" <= character && character <= "\u104FA")
    || (character >= "\u10500" && ("\u10500" <= character && character <= "\u10526")
    || (character >= "\u10530" && ("\u10530" <= character && character <= "\u10562")
    || (character >= "\u10600" && ("\u10600" <= character && character <= "\u10735")
    || (character >= "\u10740" && ("\u10740" <= character && character <= "\u10754")
    || (character >= "\u10760" && ("\u10760" <= character && character <= "\u10766")
    || (character >= "\u10800" && ("\u10800" <= character && character <= "\u10804")
    || (character >= "\u10808" && ("\u10808" <= character && character <= "\u10834")
    || (character >= "\u10837" && ("\u10837" <= character && character <= "\u10837")
    || (character >= "\u1083C" && ("\u1083C" <= character && character <= "\u10854")
    || (character >= "\u10860" && ("\u10860" <= character && character <= "\u10875")
    || (character >= "\u10880" && ("\u10880" <= character && character <= "\u1089D")
    || (character >= "\u108E0" && ("\u108E0" <= character && character <= "\u108F1")
    || (character >= "\u108F4" && ("\u108F4" <= character && character <= "\u108F4")
    || (character >= "\u10900" && ("\u10900" <= character && character <= "\u10914")
    || (character >= "\u10920" && ("\u10920" <= character && character <= "\u10938")
    || (character >= "\u10980" && ("\u10980" <= character && character <= "\u109B6")
    || (character >= "\u109BE" && ("\u109BE" <= character && character <= "\u109BE")
    || (character >= "\u10A00" && ("\u10A00" <= character && character <= "\u10A12")
    || (character >= "\u10A15" && ("\u10A15" <= character && character <= "\u10A16")
    || (character >= "\u10A19" && ("\u10A19" <= character && character <= "\u10A32")
    || (character >= "\u10A60" && ("\u10A60" <= character && character <= "\u10A7B")
    || (character >= "\u10A80" && ("\u10A80" <= character && character <= "\u10A9B")
    || (character >= "\u10AC0" && ("\u10AC0" <= character && character <= "\u10AC6")
    || (character >= "\u10AC9" && ("\u10AC9" <= character && character <= "\u10AE3")
    || (character >= "\u10B00" && ("\u10B00" <= character && character <= "\u10B34")
    || (character >= "\u10B40" && ("\u10B40" <= character && character <= "\u10B54")
    || (character >= "\u10B60" && ("\u10B60" <= character && character <= "\u10B71")
    || (character >= "\u10B80" && ("\u10B80" <= character && character <= "\u10B90")
    || (character >= "\u10C00" && ("\u10C00" <= character && character <= "\u10C47")
    || (character >= "\u10C80" && ("\u10C80" <= character && character <= "\u10CB1")
    || (character >= "\u10CC0" && ("\u10CC0" <= character && character <= "\u10CF1")
    || (character >= "\u11003" && ("\u11003" <= character && character <= "\u11036")
    || (character >= "\u11083" && ("\u11083" <= character && character <= "\u110AE")
    || (character >= "\u110D0" && ("\u110D0" <= character && character <= "\u110E7")
    || (character >= "\u11103" && ("\u11103" <= character && character <= "\u11125")
    || (character >= "\u11150" && ("\u11150" <= character && character <= "\u11171")
    || (character >= "\u11176" && ("\u11176" <= character && character <= "\u111B1")
    || (character >= "\u111C1" && ("\u111C1" <= character && character <= "\u111C3")
    || (character >= "\u111DA" && ("\u111DA" <= character && character <= "\u111DA")
    || (character >= "\u11200" && ("\u11200" <= character && character <= "\u11210")
    || (character >= "\u11213" && ("\u11213" <= character && character <= "\u1122A")
    || (character >= "\u11280" && ("\u11280" <= character && character <= "\u11285")
    || (character >= "\u11288" && ("\u11288" <= character && character <= "\u1128C")
    || (character >= "\u1128F" && ("\u1128F" <= character && character <= "\u1129C")
    || (character >= "\u1129F" && ("\u1129F" <= character && character <= "\u112A7")
    || (character >= "\u112B0" && ("\u112B0" <= character && character <= "\u112DD")
    || (character >= "\u11305" && ("\u11305" <= character && character <= "\u1130B")
    || (character >= "\u1130F" && ("\u1130F" <= character && character <= "\u1130F")
    || (character >= "\u11313" && ("\u11313" <= character && character <= "\u11327")
    || (character >= "\u1132A" && ("\u1132A" <= character && character <= "\u1132F")
    || (character >= "\u11332" && ("\u11332" <= character && character <= "\u11332")
    || (character >= "\u11335" && ("\u11335" <= character && character <= "\u11338")
    || (character >= "\u1133D" && ("\u1133D" <= character && character <= "\u1133D")
    || (character >= "\u1135D" && ("\u1135D" <= character && character <= "\u11360")
    || (character >= "\u11400" && ("\u11400" <= character && character <= "\u11433")
    || (character >= "\u11447" && ("\u11447" <= character && character <= "\u11449")
    || (character >= "\u11480" && ("\u11480" <= character && character <= "\u114AE")
    || (character >= "\u114C4" && ("\u114C4" <= character && character <= "\u114C4")
    || (character >= "\u114C7" && ("\u114C7" <= character && character <= "\u115AD")
    || (character >= "\u115D8" && ("\u115D8" <= character && character <= "\u115DA")
    || (character >= "\u11600" && ("\u11600" <= character && character <= "\u1162E")
    || (character >= "\u11644" && ("\u11644" <= character && character <= "\u116A9")
    || (character >= "\u11700" && ("\u11700" <= character && character <= "\u11718")
    || (character >= "\u118A0" && ("\u118A0" <= character && character <= "\u118DE")
    || (character >= "\u118FF" && ("\u118FF" <= character && character <= "\u118FF")
    || (character >= "\u11A0B" && ("\u11A0B" <= character && character <= "\u11A31")
    || (character >= "\u11A3A" && ("\u11A3A" <= character && character <= "\u11A3A")
    || (character >= "\u11A5C" && ("\u11A5C" <= character && character <= "\u11A82")
    || (character >= "\u11A86" && ("\u11A86" <= character && character <= "\u11A88")
    || (character >= "\u11AC0" && ("\u11AC0" <= character && character <= "\u11AF7")
    || (character >= "\u11C00" && ("\u11C00" <= character && character <= "\u11C07")
    || (character >= "\u11C0A" && ("\u11C0A" <= character && character <= "\u11C2D")
    || (character >= "\u11C40" && ("\u11C40" <= character && character <= "\u11C8E")
    || (character >= "\u11D00" && ("\u11D00" <= character && character <= "\u11D05")
    || (character >= "\u11D08" && ("\u11D08" <= character && character <= "\u11D08")
    || (character >= "\u11D0B" && ("\u11D0B" <= character && character <= "\u11D2F")
    || (character >= "\u11D46" && ("\u11D46" <= character && character <= "\u12398")
    || (character >= "\u12480" && ("\u12480" <= character && character <= "\u12542")
    || (character >= "\u13000" && ("\u13000" <= character && character <= "\u1342D")
    || (character >= "\u14400" && ("\u14400" <= character && character <= "\u14645")
    || (character >= "\u16800" && ("\u16800" <= character && character <= "\u16A37")
    || (character >= "\u16A40" && ("\u16A40" <= character && character <= "\u16A5D")
    || (character >= "\u16AD0" && ("\u16AD0" <= character && character <= "\u16AEC")
    || (character >= "\u16B00" && ("\u16B00" <= character && character <= "\u16B2E")
    || (character >= "\u16B40" && ("\u16B40" <= character && character <= "\u16B42")
    || (character >= "\u16B63" && ("\u16B63" <= character && character <= "\u16B76")
    || (character >= "\u16B7D" && ("\u16B7D" <= character && character <= "\u16B8E")
    || (character >= "\u16F00" && ("\u16F00" <= character && character <= "\u16F43")
    || (character >= "\u16F50" && ("\u16F50" <= character && character <= "\u16F9E")
    || (character >= "\u16FE0" && ("\u16FE0" <= character && character <= "\u16FE0")
    || (character >= "\u17000" && ("\u17000" <= character && character <= "\u17000")
    || (character >= "\u18800" && ("\u18800" <= character && character <= "\u18AF1")
    || (character >= "\u1B000" && ("\u1B000" <= character && character <= "\u1B11D")
    || (character >= "\u1B170" && ("\u1B170" <= character && character <= "\u1B2FA")
    || (character >= "\u1BC00" && ("\u1BC00" <= character && character <= "\u1BC69")
    || (character >= "\u1BC70" && ("\u1BC70" <= character && character <= "\u1BC7B")
    || (character >= "\u1BC80" && ("\u1BC80" <= character && character <= "\u1BC87")
    || (character >= "\u1BC90" && ("\u1BC90" <= character && character <= "\u1BC98")
    || (character >= "\u1D400" && ("\u1D400" <= character && character <= "\u1D453")
    || (character >= "\u1D456" && ("\u1D456" <= character && character <= "\u1D49B")
    || (character >= "\u1D49E" && ("\u1D49E" <= character && character <= "\u1D49E")
    || (character >= "\u1D4A2" && ("\u1D4A2" <= character && character <= "\u1D4A5")
    || (character >= "\u1D4A9" && ("\u1D4A9" <= character && character <= "\u1D4AB")
    || (character >= "\u1D4AE" && ("\u1D4AE" <= character && character <= "\u1D4B8")
    || (character >= "\u1D4BB" && ("\u1D4BB" <= character && character <= "\u1D4C2")
    || (character >= "\u1D4C5" && ("\u1D4C5" <= character && character <= "\u1D504")
    || (character >= "\u1D507" && ("\u1D507" <= character && character <= "\u1D509")
    || (character >= "\u1D50D" && ("\u1D50D" <= character && character <= "\u1D513")
    || (character >= "\u1D516" && ("\u1D516" <= character && character <= "\u1D51B")
    || (character >= "\u1D51E" && ("\u1D51E" <= character && character <= "\u1D538")
    || (character >= "\u1D53B" && ("\u1D53B" <= character && character <= "\u1D53D")
    || (character >= "\u1D540" && ("\u1D540" <= character && character <= "\u1D543")
    || (character >= "\u1D546" && ("\u1D546" <= character && character <= "\u1D54F")
    || (character >= "\u1D552" && ("\u1D552" <= character && character <= "\u1D6A4")
    || (character >= "\u1D6A8" && ("\u1D6A8" <= character && character <= "\u1D6BF")
    || (character >= "\u1D6C2" && ("\u1D6C2" <= character && character <= "\u1D6D9")
    || (character >= "\u1D6DC" && ("\u1D6DC" <= character && character <= "\u1D6F9")
    || (character >= "\u1D6FC" && ("\u1D6FC" <= character && character <= "\u1D713")
    || (character >= "\u1D716" && ("\u1D716" <= character && character <= "\u1D733")
    || (character >= "\u1D736" && ("\u1D736" <= character && character <= "\u1D74D")
    || (character >= "\u1D750" && ("\u1D750" <= character && character <= "\u1D76D")
    || (character >= "\u1D770" && ("\u1D770" <= character && character <= "\u1D787")
    || (character >= "\u1D78A" && ("\u1D78A" <= character && character <= "\u1D7A7")
    || (character >= "\u1D7AA" && ("\u1D7AA" <= character && character <= "\u1D7C1")
    || (character >= "\u1D7C4" && ("\u1D7C4" <= character && character <= "\u1D7CA")
    || (character >= "\u1E800" && ("\u1E800" <= character && character <= "\u1E8C3")
    || (character >= "\u1E900" && ("\u1E900" <= character && character <= "\u1E942")
    || (character >= "\u1EE00" && ("\u1EE00" <= character && character <= "\u1EE02")
    || (character >= "\u1EE05" && ("\u1EE05" <= character && character <= "\u1EE1E")
    || (character >= "\u1EE21" && ("\u1EE21" <= character && character <= "\u1EE21")
    || (character >= "\u1EE24" && ("\u1EE24" <= character && character <= "\u1EE24")
    || (character >= "\u1EE29" && ("\u1EE29" <= character && character <= "\u1EE31")
    || (character >= "\u1EE34" && ("\u1EE34" <= character && character <= "\u1EE36")
    || (character >= "\u1EE39" && ("\u1EE39" <= character && character <= "\u1EE39")
    || (character >= "\u1EE42" && ("\u1EE42" <= character && character <= "\u1EE42")
    || (character >= "\u1EE49" && ("\u1EE49" <= character && character <= "\u1EE49")
    || (character >= "\u1EE4D" && ("\u1EE4D" <= character && character <= "\u1EE4E")
    || (character >= "\u1EE51" && ("\u1EE51" <= character && character <= "\u1EE51")
    || (character >= "\u1EE54" && ("\u1EE54" <= character && character <= "\u1EE54")
    || (character >= "\u1EE59" && ("\u1EE59" <= character && character <= "\u1EE59")
    || (character >= "\u1EE5D" && ("\u1EE5D" <= character && character <= "\u1EE5D")
    || (character >= "\u1EE61" && ("\u1EE61" <= character && character <= "\u1EE61")
    || (character >= "\u1EE64" && ("\u1EE64" <= character && character <= "\u1EE69")
    || (character >= "\u1EE6C" && ("\u1EE6C" <= character && character <= "\u1EE71")
    || (character >= "\u1EE74" && ("\u1EE74" <= character && character <= "\u1EE76")
    || (character >= "\u1EE79" && ("\u1EE79" <= character && character <= "\u1EE7B")
    || (character >= "\u1EE7E" && ("\u1EE7E" <= character && character <= "\u1EE88")
    || (character >= "\u1EE8B" && ("\u1EE8B" <= character && character <= "\u1EE9A")
    || (character >= "\u1EEA1" && ("\u1EEA1" <= character && character <= "\u1EEA2")
    || (character >= "\u1EEA5" && ("\u1EEA5" <= character && character <= "\u1EEA8")
    || (character >= "\u1EEAB" && ("\u1EEAB" <= character && character <= "\u1EEBA")
    || (character >= "\u20000" && ("\u20000" <= character && character <= "\u20000")
    || (character >= "\u2A700" && ("\u2A700" <= character && character <= "\u2A700")
    || (character >= "\u2B740" && ("\u2B740" <= character && character <= "\u2B740")
    || (character >= "\u2B820" && ("\u2B820" <= character && character <= "\u2B820")
    || (character >= "\u2CEB0" && ("\u2CEB0" <= character && character <= "\u2CEB0")
    || (character >= "\u2F800" && ("\u2F800" <= character && character <= "\u2FA1D")
))))))))))))))))))))))))))))))))))))))))))))))))))))))))))))))))))))))))))))))))))))))))))))))))))))))))))))))))))))))))))))))))))))))))))))))))))))))))))))))))))))))))))))))))))))))))))))))))))))))))))))))))))))))))))))))))))))))))))))))))))))))))))))))))))))))))))))))))))))))))))))))))))))))))))))))))))))))))))))))))))))))))))))))))))))))))))))))))))))))))))))))))))))))))))))))))))))))))))))))))))))))))))))))))))))))))))))))))))))))))))))))))))))))))))))))))))))))))))))))))))))))))))))))))
;
}

/**
 * Is the provided character a digit?
 */
export function isDigit(character: string): boolean {
    return "0" <= character && character <= "9";
}

export function absoluteValue(value: number): number {
    return value < 0 ? value * -1 : value;
}

export class StringIterator extends IteratorBase<string> {
    private _currentIndex: number;
    private _started: boolean = false;
    private _step: number;

    constructor(private _text: string, private _startIndex: number = 0, private _endIndex: number = getLength(_text)) {
        super();

        this._currentIndex = _startIndex;
        this._step = _endIndex >= _startIndex ? 1 : -1;
    }

    public get currentIndex(): number {
        return this.hasCurrent() ? this._currentIndex : undefined;
    }

    public hasStarted(): boolean {
        return this._started;
    }

    public hasCurrent(): boolean {
        return this.hasStarted() && this.hasMore();
    }

    public getCurrent(): string {
        return this.hasCurrent() ? this._text[this._currentIndex] : undefined;
    }

    public next(): boolean {
        if (this._started === false) {
            this._started = true;
        }
        else if (this.hasMore()) {
            this._currentIndex += this._step;
        }

        return this.hasMore();
    }

    private hasMore(): boolean {
        return (this._step > 0) ? this._currentIndex < this._endIndex : this._currentIndex > this._endIndex;
    }
}

export class StringIterable extends IterableBase<string> {
    constructor(private _text: string) {
        super();
    }

    public iterate(): Iterator<string> {
        return new StringIterator(this._text, 0, getLength(this._text));
    }

    public iterateReverse(): Iterator<string> {
        return new StringIterator(this._text, getLength(this._text) - 1, -1);
    }
}