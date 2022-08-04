module PetriNets {
  type PetriNetName = String
  type Identifier = String
  type ComputedValue = any

  class Stack<T> {
    private _data: T[] = []
    public push(item: T) {
      this._data.push(item)
    }
    public pop(): T | undefined {
      return this._data.pop()
    }
    public peek(): T {
      return this._data[this._data.length - 1]
    }
    public isEmpty(): boolean {
      return this._data.length === 0
    }
  }

  class ImmutableStack<T> {
    private readonly _data: T[] = []
    constructor(...items: T[]) {
        this._data = [...items]
    }

    public push(item: T): ImmutableStack<T> {
        return new ImmutableStack<T>(...(this._data.concat([item])))
    }
    public pop(): [T | undefined, ImmutableStack<T>] {
      const newData = this._data.slice(0, this._data.length - 1)
      return [this._data.pop(), new ImmutableStack<T>(...newData)]
    }
    public peek(): T | undefined {
      return this._data[this._data.length - 1]
    }
    public isEmpty(): boolean {
      return this._data.length === 0
    }
  }

  interface HasIdentifier<I extends Identifier> {
    readonly identifier: I
  }

  type MarkerIdentifier = Identifier;
  interface Marker<PetriNetName, WrappedType extends any> extends HasIdentifier<MarkerIdentifier> {
    readonly wrappedValue: WrappedType
  }

  type PlaceIdentifier = Identifier;
  interface Place<PetriNetName> extends HasIdentifier<PlaceIdentifier> {
    readonly currentMarkings: Map<Identifier, Marker<PetriNetName, any>>
    withMarkings(newMarkings: Map<Identifier, Marker<PetriNetName, any>>): Place<PetriNetName>
    withAddedMarkings(addedMarkings: Map<Identifier, Marker<PetriNetName, any>>): Place<PetriNetName>
  }

  
  type MarkerConsumedCount = number
  type MarkerCreatedCount = number
  type TransitionIdentifier = Identifier;
  type TransitionExecutor = <C extends ComputedValue>(places: Map<Identifier, Place<PetriNetName>>, currentComputedValue: C) => [Map<Identifier, Place<PetriNetName>>, C, MarkerConsumedCount, MarkerCreatedCount]
  interface Transition<PetriNetName, C extends ComputedValue> extends HasIdentifier<TransitionIdentifier> {
    readonly priority: number
    withPriority(priority: number): Transition<PetriNetName, C>
    withExecutor(
      executor:  TransitionExecutor
    ): Transition<PetriNetName, C>
    executeOnPlaces(places:Map<Identifier, Place<PetriNetName>>, computedValue: C): [Map<Identifier, Place<PetriNetName>>, C, MarkerConsumedCount, MarkerCreatedCount]
  }

  type PetriNetIdentifier = Identifier;
  type PetriNetVersionInteger = number;
  interface PetriNet<PetriNetName, C extends ComputedValue> extends HasIdentifier<PetriNetIdentifier> {
    readonly places: Map<Identifier, Place<PetriNetName>>
    readonly transitions: Map<Identifier, Transition<PetriNetName, C>>
    readonly transitionHistory: ImmutableStack<[EpochTimeStamp, TransitionIdentifier, PetriNetVersionInteger]>
    readonly computedValue: ComputedValue | null
    withPlaces(places: Map<Identifier, Place<PetriNetName>>): PetriNet<PetriNetName, C>
    withTransitions(transitions: Map<Identifier, Transition<PetriNetName, C>>): PetriNet<PetriNetName, C>
    withMarkingsByPlaceId(newMarkings: Map<Identifier, Map<Identifier, Marker<PetriNetName, any>>>): PetriNet<PetriNetName, C>
    withAddedMarkingsByPlaceId(addedMarkings: Map<Identifier, Map<Identifier, Marker<PetriNetName, any>>>): PetriNet<PetriNetName, C>
    executeTransitionsByPriority(): PetriNet<PetriNetName, C>
  }

  class GenericMarker<PetriNetName, WrappedType extends any> implements Marker<PetriNetName, WrappedType> {
    constructor(public readonly identifier: MarkerIdentifier, public readonly wrappedValue: WrappedType){}
  }

  class GenericPlace<PetriNetName> implements Place<PetriNetName> {
    constructor(public readonly identifier: PlaceIdentifier, public readonly currentMarkings: Map<Identifier, Marker<PetriNetName, any>>){}
    public withMarkings(newMarkings: Map<Identifier, Marker<PetriNetName, any>>): GenericPlace<PetriNetName> {
      return new GenericPlace<PetriNetName>(this.identifier, newMarkings)
    }
    public withAddedMarkings(addedMarkings: Map<Identifier, Marker<PetriNetName, any>>): GenericPlace<PetriNetName> {
      const combined = this.currentMarkings
      addedMarkings.forEach((value, key) => combined.set(key, value));
      return new GenericPlace<PetriNetName>(this.identifier, combined)
    }
  }

  class GenericTransition<PetriNetName, C extends ComputedValue> implements Transition<PetriNetName, C> {
    constructor(
      public readonly identifier: TransitionIdentifier, 
      public readonly priority: number, 
      protected readonly executor: TransitionExecutor
    ){}

    public withPriority(priority: number): GenericTransition<PetriNetName, C> {
      return new GenericTransition<PetriNetName, C>(this.identifier, priority, this.executor)
    }

    public withExecutor(
      executor: TransitionExecutor
    ): GenericTransition<PetriNetName, C> {
      return new GenericTransition<PetriNetName, C>(this.identifier, this.priority, executor)
    }

    public executeOnPlaces(places: Map<Identifier, Place<PetriNetName>>, computedValue: C): [Map<Identifier, Place<PetriNetName>>, C, MarkerConsumedCount, MarkerCreatedCount] {
      return this.executor(places, computedValue)
    }
  }

  class GenericPetriNet<PetriNetName, C extends ComputedValue> implements PetriNet<PetriNetName, C> {
    constructor(
      public readonly identifier: PetriNetIdentifier,
      public readonly computedValue: C,
      public readonly initialComputedValue: C,
      public readonly places: Map<Identifier, Place<PetriNetName>> = new Map(), 
      public readonly transitions: Map<Identifier, Transition<PetriNetName, C>> = new Map(),
      public readonly transitionHistory: ImmutableStack<[EpochTimeStamp, TransitionIdentifier, PetriNetVersionInteger]> = new ImmutableStack()
    ) {}

    public withPlaces(places: Map<Identifier, Place<PetriNetName>>): PetriNet<PetriNetName, C> {
      return new GenericPetriNet<PetriNetName, C>(this.identifier, this.computedValue, this.initialComputedValue, places, this.transitions, this.transitionHistory)
    }
    
    public withTransitions(transitions: Map<Identifier, Transition<PetriNetName, C>>): PetriNet<PetriNetName, C> {
      return new GenericPetriNet<PetriNetName, C>(this.identifier, this.computedValue, this.initialComputedValue, this.places, transitions, this.transitionHistory)
    }

    public withMarkingsByPlaceId(newMarkings: Map<Identifier, Map<Identifier, Marker<PetriNetName, any>>>): PetriNet<PetriNetName, C> {
      const newPlaces: Map<Identifier, Place<PetriNetName>> = this.places
      for (const [placeId, markerMap] of newMarkings) {
        if (this.places.has(placeId)) {
          newPlaces.set(placeId, this.places.get(placeId as Identifier)!.withMarkings(markerMap))
        }
      }
      return new GenericPetriNet<PetriNetName, C>(this.identifier, this.computedValue, this.initialComputedValue, newPlaces, this.transitions, this.transitionHistory)
    }

    public withAddedMarkingsByPlaceId(addedMarkings: Map<Identifier, Map<Identifier, Marker<PetriNetName, any>>>): PetriNet<PetriNetName, C> {
      const newPlaces: Map<Identifier, Place<PetriNetName>> = this.places
      for (const [placeId, markerMap] of addedMarkings) {
        if (this.places.has(placeId)) {
          newPlaces.set(placeId, this.places.get(placeId as Identifier)!.withAddedMarkings(markerMap))
        }
      }
      return new GenericPetriNet<PetriNetName, C>(this.identifier, this.computedValue, this.initialComputedValue, newPlaces, this.transitions, this.transitionHistory)
    }

    public withResetMarkings(resetHistory: boolean = true): PetriNet<PetriNetName, C> {
      var newPlaces: Map<Identifier, Place<PetriNetName>> = new Map()
      this.places.forEach(
        function(value: Place<PetriNetName>, key: Identifier, map:Map<Identifier, Place<PetriNetName>>) {
          newPlaces.set(key, value.withMarkings(new Map()))
        }      
      )
      const lastHistoryEntry = this.transitionHistory.peek()
      const nowTimestamp = Date.now()
      const lastVersion = typeof lastHistoryEntry === 'undefined' ? 0 : lastHistoryEntry[2];
      const newHistory = resetHistory ? new ImmutableStack() : this.transitionHistory.push([nowTimestamp, 'reset', lastVersion + 1])
      return new GenericPetriNet<PetriNetName, C>(this.identifier,this.initialComputedValue, this.initialComputedValue, newPlaces, this.transitions)
    }

    public executeTransitionsByPriority(): PetriNet<PetriNetName, C> {
      const sortedTransitions = [...this.transitions].sort((a, b) => {
        if (a[1].priority > b[1].priority) {
          return -1;   
        }
        if (a[1].priority == b[1].priority) {
          return 0
        }
        return 1;
      })
      var places: Map<Identifier, Place<PetriNetName>> = this.places
      var computedValue: C = this.computedValue      
      const lastHistoryEntry = this.transitionHistory.peek()

      const lastVersion = typeof lastHistoryEntry === 'undefined' ? 0 : lastHistoryEntry[2];
      var currVersion = lastVersion
      var newTransitionHistory = this.transitionHistory
      sortedTransitions.forEach((value: [Identifier, Transition<PetriNetName, C>]) => {
        const tuple = value[1].executeOnPlaces(places, computedValue);
        places = tuple[0]
        computedValue = tuple[1]
        const hasChanges = (tuple[2] + tuple[3]) > 0
        if (hasChanges) {
          currVersion += 1
          newTransitionHistory = this.transitionHistory.push([Date.now(), value[1].identifier, currVersion])
        }
      })
      
      return new GenericPetriNet<PetriNetName, C>(
        this.identifier,
        computedValue,
        this.initialComputedValue,
        places,
        this.transitions
      )

    }
  }

  type PetriNetUpdatingRequestHandler = <N extends PetriNetName, C extends ComputedValue>(req: Request, petriNet: PetriNet<N, C>) => Map<Identifier, Map<Identifier, Marker<N, any>>>
  type PetriNetQueryingRequestHandler = <N extends PetriNetName, C extends ComputedValue>(req: Request, petriNet: PetriNet<N, C>) => String

  type OrderPetriNet = PetriNetName
  type ShippingPetriNet = PetriNetName

  interface Address {
    readonly firstName: String
    readonly lastName: String
    readonly street: String
    readonly streetNo: String
    readonly country: String
    readonly phone: String|null
    readonly aptNo: String|null
  }

  interface Currency {
    readonly code: String
    readonly symbol: String
    readonly decimalShiftPlaces: number
  }

  type Percentage = number
  type Amount = number

  interface PriceAdjustment<ValueType extends Percentage | Amount> {
    readonly code: String
    readonly description: String | null
    readonly value: ValueType
  }

  type TaxRateCode = String

  interface TaxRate extends PriceAdjustment<Percentage> {
    readonly code: TaxRateCode
    readonly ratePercent: number

  }

  interface AmountAdjustment extends PriceAdjustment<Amount> {
    readonly code: Identifier
    readonly rateAmount: number
  }

  interface PercentageAdjustment extends PriceAdjustment<Percentage> {
    readonly code: Identifier
    readonly ratePercent: number
  }

  interface Price {
    readonly currency: Currency
    readonly value: number
    readonly includesVAT: boolean
    readonly includedAdjustments: PriceAdjustment<Amount | Percentage>[]
  }

  interface OrderStepLine {
    readonly lineNo: number
    readonly itemIdentifier1: Identifier
    readonly itemIdentifier2: Identifier
    readonly description: String
    readonly quantity: number
    readonly unitOfMeasure: String
    readonly singleUnitOfMeasurePrice: Price
    readonly percentDiscounted: number
    readonly valueDiscounted: number
    readonly lineSum: Price
    readonly includesVAT: boolean
  }

  interface BasketLine extends OrderStepLine {}
  interface OrderLine extends OrderStepLine {}

  interface Basket {
    readonly lines: BasketLine[]
  }

  interface PaymentMethod {
    readonly name: String
  }

  interface Order {
    readonly id: String
    readonly name: String
    readonly lines: OrderLine[]
    readonly userId: String
    readonly sum: Price
  }

  interface OrderConfirmation {
    readonly userId: String
    readonly orderId: String
  }

  class AddressMarker implements Marker<OrderPetriNet, Address> {
    constructor(public readonly identifier: Identifier, public readonly wrappedValue: Address){}
  }

  class BasketMarker implements Marker<OrderPetriNet, Basket> {
    constructor(public readonly identifier: Identifier, public readonly wrappedValue: Basket){}
  }

  class PaymentMethodMarker implements Marker<OrderPetriNet, PaymentMethod> {
    constructor(public readonly identifier: Identifier, public readonly wrappedValue: PaymentMethod){}
  }

  class OrderConfirmationMarker implements Marker<OrderPetriNet, OrderConfirmation> {
    constructor(public readonly identifier: Identifier, public readonly wrappedValue: OrderConfirmation){}
  }

  class OrderCreatedMarker implements Marker<OrderPetriNet, Date> {
    constructor(public readonly identifier: Identifier, public readonly wrappedValue: Date){}
  }

  class OrderStep1Place extends GenericPlace<OrderPetriNet> {
    public readonly basketMarker: BasketMarker | null
    public readonly addressMarker: AddressMarker | null
    constructor(currentMarkings: [BasketMarker | null, AddressMarker | null]) {
      const markerMap = new Map<Identifier, Marker<OrderPetriNet, Basket | Address>>()
      if (null !== currentMarkings[0]) {
        markerMap.set(currentMarkings[0].identifier, currentMarkings[0])
      }
      if (null !== currentMarkings[1]) {
        markerMap.set(currentMarkings[1].identifier, currentMarkings[1])
      }
      super('OrderStep1Place', markerMap)
      this.basketMarker = currentMarkings[0]
      this.addressMarker = currentMarkings[1]
    }

    public withBasketMarker(basketMarker: BasketMarker): OrderStep1Place {
      return new OrderStep1Place([basketMarker, this.addressMarker])
    }

    public withAddressMarker(addressMarker: AddressMarker): OrderStep1Place {
      return new OrderStep1Place([this.basketMarker, addressMarker])
    }
  }

  class OrderStep2Place extends GenericPlace<OrderPetriNet> {

    protected readonly basketMarker: BasketMarker | null
    protected readonly addressMarker: AddressMarker | null
    protected readonly paymentMethodMarker: PaymentMethodMarker | null
    constructor(currentMarkings: [BasketMarker | null, AddressMarker | null, PaymentMethodMarker | null] = [null, null, null]) {
      const markerMap = new Map<Identifier, Marker<OrderPetriNet, Basket | Address | PaymentMethod>>()
      if (null !== currentMarkings[0]) {
        markerMap.set(currentMarkings[0].identifier, currentMarkings[0])
      }
      if (null !== currentMarkings[1]) {
        markerMap.set(currentMarkings[1].identifier, currentMarkings[1])
      }
      if (null !== currentMarkings[2]) {
        markerMap.set(currentMarkings[2].identifier, currentMarkings[2])
      }
      super('OrderStep2Place', markerMap)
      this.basketMarker = currentMarkings[0]
      this.addressMarker = currentMarkings[1]
      this.paymentMethodMarker = currentMarkings[2]
    }

    public withBasketMarker(basketMarker: BasketMarker): OrderStep2Place {
      return new OrderStep2Place([basketMarker, this.addressMarker, this.paymentMethodMarker])
    }

    public withAddressMarker(addressMarker: AddressMarker): OrderStep2Place {
      return new OrderStep2Place([this.basketMarker, addressMarker, this.paymentMethodMarker])
    }

    public withPaymentMethodMarker(paymentMethodMarker: PaymentMethodMarker): OrderStep2Place {
      return new OrderStep2Place([this.basketMarker, this.addressMarker, paymentMethodMarker])
    }
  }

  class OrderConfirmedPlace extends GenericPlace<OrderPetriNet> {
    protected readonly basketMarker: BasketMarker | null
    protected readonly addressMarker: AddressMarker | null
    protected readonly paymentMethodMarker: PaymentMethodMarker | null
    protected readonly orderConfirmationMarker: OrderConfirmationMarker | null
    constructor(
      currentMarkings:
        [BasketMarker | null, AddressMarker | null, PaymentMethodMarker | null, OrderConfirmationMarker | null] = [null, null, null, null]
        ) {
      const markerMap = new Map<Identifier, Marker<OrderPetriNet, Basket | Address | PaymentMethod | OrderConfirmation>>()
      if (null !== currentMarkings[0]) {
        markerMap.set(currentMarkings[0].identifier, currentMarkings[0])
      }
      if (null !== currentMarkings[1]) {
        markerMap.set(currentMarkings[1].identifier, currentMarkings[1])
      }
      if (null !== currentMarkings[2]) {
        markerMap.set(currentMarkings[2].identifier, currentMarkings[2])
      }
      if (null !== currentMarkings[3]) {
        markerMap.set(currentMarkings[3].identifier, currentMarkings[3])
      }
      super('OrderStep2Place', markerMap)
      this.basketMarker = currentMarkings[0]
      this.addressMarker = currentMarkings[1]
      this.paymentMethodMarker = currentMarkings[2]
      this.orderConfirmationMarker = currentMarkings[3]
    }

    public withBasketMarker(basketMarker: BasketMarker): OrderConfirmedPlace {
      return new OrderConfirmedPlace([basketMarker, this.addressMarker, this.paymentMethodMarker, this.orderConfirmationMarker])
    }

    public withAddressMarker(addressMarker: AddressMarker): OrderConfirmedPlace {
      return new OrderConfirmedPlace([this.basketMarker, addressMarker, this.paymentMethodMarker, this.orderConfirmationMarker])
    }

    public withPaymentMethodMarker(paymentMethodMarker: PaymentMethodMarker): OrderConfirmedPlace {
      return new OrderConfirmedPlace([this.basketMarker, this.addressMarker, paymentMethodMarker, this.orderConfirmationMarker])
    }

    public withOrderConfirmationMarker(orderConfirmationMarker: OrderConfirmationMarker): OrderConfirmedPlace {
      return new OrderConfirmedPlace([this.basketMarker, this.addressMarker, this.paymentMethodMarker, orderConfirmationMarker])
    }
  }

  const transitionFromStep1ToStep2Exec: TransitionExecutor = 
    (places: Map<PlaceIdentifier, Place<PetriNetName>>, currentComputedValue: ComputedValue) => {
      /**
       * @var OrderStep1Place step1Place
       */
      const step1Place = places.has('OrderStep1Place') ? places.get('OrderStep1Place') : null
      const step2Place = places.has('OrderStep2Place') ? places.get('OrderStep2Place') : null
      if (step1Place instanceof OrderStep1Place && step2Place instanceof OrderStep2Place) {
        const basketMarker = step1Place.basketMarker
        const addressMarker = step1Place.addressMarker
        if (null !== basketMarker && null !== addressMarker) {
          const modifiedStep1Place = step1Place.withMarkings(new Map())
          const modifiedStep2Place = step2Place.withAddedMarkings(
            new Map<Identifier, Marker<PetriNetName, any>>([
              [basketMarker.identifier, basketMarker], 
              [addressMarker.identifier, addressMarker]
            ])
          )
          const newComputedValue = 
            currentComputedValue instanceof Array<String> ?
              currentComputedValue.concat("Transitioned from OrderStep1 to OrderStep2, using and creating 2 Markers each.") :
              currentComputedValue
          const newPlaces = places.set(step1Place.identifier, modifiedStep1Place).set(step2Place.identifier, modifiedStep2Place)
          return [newPlaces, newComputedValue, 2, 2]
        }
      }
      return [places, currentComputedValue, 0, 0]
    }
  
}

